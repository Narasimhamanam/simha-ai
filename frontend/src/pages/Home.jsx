import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import ChatArea from "../components/ChatArea";
import ChatHistoryPage from "../components/ChatHistoryPage";
import SettingsPage from "../components/SettingsPage";
import EmailComposer from "../components/EmailComposer";
import CalendarComposer from "../components/CalendarComposer";
import UrlSummarizer from "../components/UrlSummarizer";
import ConnectionStatus from "../components/ConnectionStatus";
import DocumentsPage from "../components/DocumentsPage";
import LandingPage from "./LandingPage";
import PricingPage from "./PricingPage";
import PaymentStatusPage from "./PaymentStatusPage";
import AdminDashboard from "./AdminDashboard";
import LegalPages from "./LegalPages";
import AuthModal from "../components/AuthModal";

import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, provider } from "../firebase";
import { useTheme } from "../context/ThemeContext";
import API from "../services/api";
import { startKeepAlive, stopKeepAlive } from "../services/keepAlive";
import { AlertCircle, Sparkles } from "lucide-react";

export default function Home() {
  const { theme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("study");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login");

  // Authentication & State Machine
  const isDevGuest = (import.meta.env.VITE_DEV_GUEST || "").toString().toLowerCase() === "true";
  const [authLoading, setAuthLoading] = useState(!isDevGuest);
  const [user, setUser] = useState(
    isDevGuest ? { email: "guest@local", displayName: "Guest", photoURL: null } : null
  );
  const [profile, setProfile] = useState(null);

  // Background AI Cluster Availability (non-blocking)
  const [aiStatus, setAiStatus] = useState("checking"); // "ready" | "warming_up" | "degraded" | "checking"
  const [backendMessage, setBackendMessage] = useState("");

  // Determine initial page based on URL
  const isPaymentRedirect =
    window.location.pathname.includes("/payment/status") ||
    window.location.pathname.includes("/payment/success") ||
    window.location.search.includes("order_id") ||
    window.location.search.includes("link_id");
  const initialPage = isPaymentRedirect ? "payment_status" : "chat";

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [legalTab, setLegalTab] = useState("terms");

  const initialWorkspaceId = "workspace-default";
  const [chats, setChats] = useState([
    { id: initialWorkspaceId, title: "New Workspace", messages: [] },
  ]);
  const [activeChatId, setActiveChatId] = useState(initialWorkspaceId);

  const [usage, setUsage] = useState({
    messages_used: 0,
    messages_limit: 10,
    documents_used: 0,
    documents_limit: 2,
    quota_reached: false,
    plan: "FREE",
    days_remaining: 0,
    is_premium: false,
  });

  const isPro = usage.is_premium || usage.plan === "ASTRA_7_DAY";
  const daysRemaining = usage.days_remaining || 0;
  const pendingPageRef = useRef(null);

  const fetchUsage = useCallback(async (email) => {
    if (!email) return;
    try {
      const r = await API.get(`/user-usage/${encodeURIComponent(email)}`);
      setUsage(r.data);
    } catch {
      try {
        const fallback = await API.get(`/user-credits/${encodeURIComponent(email)}`);
        setUsage(fallback.data);
      } catch {
        // Non-blocking
      }
    }
  }, []);

  // Background, non-blocking cluster warmup and chat synchronization
  const initBackendAndChats = useCallback(
    async (email) => {
      if (!email) return;

      // 1. Check AI Cluster health (fast non-blocking ping)
      try {
        await API.get("/ping", { timeout: 6000 });
        setAiStatus("ready");
        setBackendMessage("");
      } catch {
        // Server is spinning up (Render cold-start) or slow
        setAiStatus("warming_up");
        setBackendMessage("Astra AI inference cluster is warming up (cloud cold-start ~30s). Workspaces are ready.");

        // Re-check once in background after a brief delay
        setTimeout(() => {
          API.get("/ping", { timeout: 15000 })
            .then(() => {
              setAiStatus("ready");
              setBackendMessage("");
            })
            .catch(() => {
              setAiStatus("degraded");
              setBackendMessage("AI inference is temporarily unreachable. You can continue using your account.");
            });
        }, 6000);
      }

      // 2. Fetch server chats in background
      try {
        const r = await API.get(`/get-chats/${encodeURIComponent(email)}`, { timeout: 12000 });
        if (r.data && r.data.length > 0) {
          setChats(r.data);
          setActiveChatId((prev) => {
            const exists = r.data.some((c) => c.id === prev);
            return exists ? prev : r.data[0].id;
          });
        } else {
          // Attempt to register initial chat on server
          try {
            const cr = await API.post(
              "/create-chat",
              { user_email: email, title: "New Workspace" },
              { timeout: 8000 }
            );
            if (cr.data?.chat_id) {
              const nc = { id: cr.data.chat_id, title: "New Workspace", messages: [] };
              setChats([nc]);
              setActiveChatId(nc.id);
            }
          } catch {
            // Keep default local workspace
          }
        }
      } catch (err) {
        console.warn("[Chats] Background load notice:", err?.message);
      }

      // 3. Fetch usage quotas
      fetchUsage(email);
    },
    [fetchUsage]
  );

  const createNewChat = async () => {
    const fallbackId = `workspace-${Date.now()}`;
    const localNewChat = { id: fallbackId, title: "New Workspace", messages: [] };
    setChats((p) => [localNewChat, ...p]);
    setActiveChatId(fallbackId);
    setCurrentPage("chat");
    if (window.innerWidth < 1024) setIsSidebarOpen(false);

    if (user?.email) {
      try {
        const r = await API.post(
          "/create-chat",
          { user_email: user.email, title: "New Workspace" },
          { timeout: 10000 }
        );
        if (r.data?.chat_id) {
          setChats((p) =>
            p.map((c) => (c.id === fallbackId ? { ...c, id: r.data.chat_id } : c))
          );
          setActiveChatId(r.data.chat_id);
        }
      } catch (e) {
        console.warn("[Chat] createNewChat server sync notice:", e?.message);
      }
    }
  };

  // Firebase Auth State Observer
  useEffect(() => {
    if (isDevGuest) return;

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setAuthLoading(false);
        setShowAuthModal(false);

        // Baseline profile populated from Firebase immediately
        setProfile({
          nickname: u.displayName || "Astra User",
          email: u.email,
          avatar: u.photoURL,
          is_admin: false,
        });

        if (pendingPageRef.current) {
          setCurrentPage(pendingPageRef.current);
          pendingPageRef.current = null;
        }

        // Establish backend session with Firebase ID token (non-blocking)
        try {
          const token = await u.getIdToken();
          if (token) {
            API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          }
          API.defaults.headers.common["X-User-Email"] = u.email;

          API.post("/api/auth/session", {
            id_token: token,
            email: u.email,
            name: u.displayName,
            avatar: u.photoURL,
          })
            .then((res) => {
              if (res.data?.user) {
                setProfile((prev) => ({
                  ...prev,
                  ...res.data.user,
                  nickname: res.data.user.name || prev?.nickname || "Astra User",
                }));
              }
            })
            .catch((sessionErr) => {
              console.warn("[Auth] Session sync notice:", sessionErr?.message);
            });
        } catch (tokErr) {
          console.warn("[Auth] ID token acquisition notice:", tokErr);
        }

        // Background synchronization
        initBackendAndChats(u.email);
        startKeepAlive();
      } else {
        stopKeepAlive();
        setUser(null);
        setProfile(null);
        setChats([{ id: initialWorkspaceId, title: "New Workspace", messages: [] }]);
        setActiveChatId(initialWorkspaceId);
        setAuthLoading(false);
        delete API.defaults.headers.common["X-User-Email"];
        delete API.defaults.headers.common["Authorization"];
      }
    });

    return () => unsub();
  }, [isDevGuest, initBackendAndChats]);

  // Periodic usage polling when signed in
  useEffect(() => {
    if (user?.email) {
      const i = setInterval(() => fetchUsage(user.email), 30000);
      return () => clearInterval(i);
    }
  }, [user, fetchUsage]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error("Google login failed:", e);
      throw e; // Pass to AuthModal for friendly error banner
    }
  };

  const handleEmailLogin = async (email, password) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const handleEmailSignup = async (email, password) => {
    await createUserWithEmailAndPassword(auth, email.trim(), password);
  };

  const handlePasswordReset = async (email) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const handleLogout = async () => {
    await signOut(auth);
    setChats([{ id: initialWorkspaceId, title: "New Workspace", messages: [] }]);
    setActiveChatId(initialWorkspaceId);
    setProfile(null);
    setCurrentPage("chat");
  };

  const activeChat = chats.find((c) => c.id === activeChatId) || chats[0];

  // 1. FAST INITIAL SPLASH (only while Firebase reads cached auth token from storage)
  if (authLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[var(--void)] text-[var(--ink-1)]">
        <div className="w-12 h-12 rounded-2xl bg-[var(--astra-glow)] border border-[var(--edge)] flex items-center justify-center mx-auto mb-4 text-[var(--astra-cyan)] animate-pulse">
          <Sparkles size={24} />
        </div>
        <p className="text-xs font-semibold tracking-wide text-[var(--ink-2)]">Initializing Astra AI...</p>
      </div>
    );
  }

  // 2. PUBLIC LANDING PAGE (Unauthenticated visitors)
  if (!user) {
    if (currentPage === "legal") {
      return (
        <div className="h-screen flex flex-col bg-[var(--void)] text-[var(--ink-1)]">
          <LegalPages initialTab={legalTab} onBack={() => setCurrentPage("chat")} />
        </div>
      );
    }
    return (
      <>
        <LandingPage
          onStartFree={() => {
            setAuthModalMode("login");
            setShowAuthModal(true);
          }}
          onGetPass={() => {
            pendingPageRef.current = "pricing";
            setAuthModalMode("login");
            setShowAuthModal(true);
          }}
          onOpenLegal={(tab) => {
            setLegalTab(tab);
            setCurrentPage("legal");
          }}
        />
        {showAuthModal && (
          <AuthModal
            mode={authModalMode}
            setMode={setAuthModalMode}
            onClose={() => setShowAuthModal(false)}
            onGoogleLogin={handleGoogleLogin}
            onEmailLogin={handleEmailLogin}
            onEmailSignup={handleEmailSignup}
            onPasswordReset={handlePasswordReset}
          />
        )}
      </>
    );
  }

  // 3. AUTHENTICATED ASTRA WORKSPACE (IMMEDIATELY ACCESSIBLE)
  return (
    <div className="fixed inset-0 flex overflow-hidden text-sm bg-[var(--void)] text-[var(--ink-1)]">
      <ConnectionStatus theme={theme} />

      <Sidebar
        theme={theme}
        chats={chats}
        setChats={setChats}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
        setCurrentPage={setCurrentPage}
        currentPage={currentPage}
        createNewChat={createNewChat}
        profile={profile}
        handleLogout={handleLogout}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isPro={isPro}
        daysRemaining={daysRemaining}
        selectedAgent={selectedAgent}
        setSelectedAgent={setSelectedAgent}
      />

      {/* Main viewport area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-all duration-300 lg:ml-[64px]">
        <Header
          setIsSidebarOpen={setIsSidebarOpen}
          isSidebarOpen={isSidebarOpen}
          activeChat={activeChat}
          currentPage={currentPage}
          createNewChat={createNewChat}
          usage={usage}
          isPro={isPro}
          daysRemaining={daysRemaining}
          selectedAgent={selectedAgent}
          setSelectedAgent={setSelectedAgent}
        />

        {/* Non-blocking AI Cluster status banner (only if warming up or degraded) */}
        {aiStatus === "warming_up" && (
          <div className="px-4 py-1.5 bg-blue-500/10 border-b border-blue-500/20 text-blue-400 text-xs flex items-center justify-between shrink-0 z-10 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span>{backendMessage || "Astra AI cluster is warming up (cold-start). Workspaces are ready."}</span>
            </div>
            <button
              onClick={() => initBackendAndChats(user?.email)}
              className="text-[11px] font-semibold underline hover:text-blue-300 transition"
            >
              Check Status
            </button>
          </div>
        )}

        {aiStatus === "degraded" && (
          <div className="px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs flex items-center justify-between shrink-0 z-10 animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-amber-400 shrink-0" />
              <span>{backendMessage || "AI inference is temporarily unreachable. You can continue browsing workspaces."}</span>
            </div>
            <button
              onClick={() => initBackendAndChats(user?.email)}
              className="text-[11px] font-semibold underline hover:text-amber-200 transition"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Dynamic Page Views */}
        {currentPage === "chat" && (
          <ChatArea
            theme={theme}
            chats={chats}
            setChats={setChats}
            activeChat={activeChat}
            activeChatId={activeChatId}
            user={user}
            usage={usage}
            fetchUsage={() => fetchUsage(user?.email)}
            isPro={isPro}
            onNavigateToPricing={() => setCurrentPage("pricing")}
            selectedAgent={selectedAgent}
            setSelectedAgent={setSelectedAgent}
          />
        )}

        {currentPage === "pricing" && (
          <PricingPage
            user={user}
            usage={usage}
            onBack={() => setCurrentPage("chat")}
            onStartFree={() => setCurrentPage("chat")}
          />
        )}

        {currentPage === "payment_status" && (
          <PaymentStatusPage
            onReturnToWorkspace={() => {
              fetchUsage(user?.email);
              setCurrentPage("chat");
            }}
            onRetryPayment={() => setCurrentPage("pricing")}
          />
        )}

        {currentPage === "admin" && (
          <AdminDashboard user={user} onBack={() => setCurrentPage("chat")} />
        )}

        {currentPage === "legal" && (
          <LegalPages initialTab={legalTab} onBack={() => setCurrentPage("chat")} />
        )}

        {currentPage === "documents" && (
          <DocumentsPage
            theme={theme}
            user={user}
            setActiveChatId={setActiveChatId}
            setCurrentPage={setCurrentPage}
          />
        )}

        {currentPage === "history" && (
          <ChatHistoryPage
            theme={theme}
            chats={chats}
            setActiveChatId={setActiveChatId}
            setCurrentPage={setCurrentPage}
          />
        )}

        {currentPage === "email" && (
          <EmailComposer
            theme={theme}
            profile={profile}
            onClose={() => setCurrentPage("chat")}
            credits={usage?.messages_limit - usage?.messages_used}
            isPro={isPro}
            fetchCredits={() => fetchUsage(user?.email)}
          />
        )}

        {currentPage === "calendar" && (
          <CalendarComposer
            theme={theme}
            profile={profile}
            onClose={() => setCurrentPage("chat")}
            credits={usage?.messages_limit - usage?.messages_used}
            isPro={isPro}
            fetchCredits={() => fetchUsage(user?.email)}
          />
        )}

        {currentPage === "url" && (
          <UrlSummarizer
            theme={theme}
            onClose={() => setCurrentPage("chat")}
            credits={usage?.messages_limit - usage?.messages_used}
            isPro={isPro}
            fetchCredits={() => fetchUsage(user?.email)}
            userEmail={user?.email}
          />
        )}

        {currentPage === "settings" && (
          <SettingsPage
            theme={theme}
            profile={profile}
            setProfile={setProfile}
            isPro={isPro}
            daysRemaining={daysRemaining}
            onNavigateToPricing={() => setCurrentPage("pricing")}
          />
        )}
      </div>
    </div>
  );
}
