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
import { AlertCircle, RefreshCw, Sparkles } from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const prewarm = () => fetch(`${BACKEND_URL}/ping`).catch(() => {});

export default function Home() {
  const { theme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [appLoading, setAppLoading] = useState(false);
  const [appError, setAppError] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("study");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login");

  const isDevGuest = (import.meta.env.VITE_DEV_GUEST || "").toString().toLowerCase() === "true";
  const [user, setUser] = useState(
    isDevGuest ? { email: "guest@local", displayName: "Guest", photoURL: null } : null
  );
  const [profile, setProfile] = useState(null);

  // Determine initial page based on URL
  const isPaymentRedirect =
    window.location.pathname.includes("/payment/status") ||
    window.location.pathname.includes("/payment/success") ||
    window.location.search.includes("order_id") ||
    window.location.search.includes("link_id");
  const initialPage = isPaymentRedirect ? "payment_status" : "chat";

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [legalTab, setLegalTab] = useState("terms");

  const guestChatId = "local-guest-chat";
  const [chats, setChats] = useState(isDevGuest ? [{ id: guestChatId, title: "New Workspace", messages: [] }] : []);
  const [activeChatId, setActiveChatId] = useState(isDevGuest ? guestChatId : null);

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

  const fetchUsage = useCallback(async (email) => {
    if (!email) return;
    try {
      const r = await API.get(`/user-usage/${encodeURIComponent(email)}`);
      setUsage(r.data);
    } catch {
      try {
        const fallback = await API.get(`/user-credits/${encodeURIComponent(email)}`);
        setUsage(fallback.data);
      } catch { /* ignore fallback failure */ }
    }
  }, []);

  const warmUpBackend = async () => {
    for (let i = 0; i < 15; i++) {
      try {
        await API.get("/ping", { timeout: 8000 });
        return true;
      } catch {
        if (i < 14) {
          setAppError(`Connecting to Astra AI cluster... (${(14 - i) * 3}s)`);
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
    }
    return false;
  };

  const [retryCountdown, setRetryCountdown] = useState(0);
  const retryTimerRef = useRef(null);
  const retryFnRef = useRef(null);
  const pendingPageRef = useRef(null);

  const fetchChats = useCallback(
    async (email) => {
      setAppLoading(true);
      setAppError("Connecting to Astra AI...");
      const alive = await warmUpBackend();
      if (!alive) {
        setAppLoading(false);
        setAppError("Could not reach Astra backend.");
        let c = 20;
        setRetryCountdown(c);
        retryTimerRef.current = setInterval(() => {
          c--;
          setRetryCountdown(c);
          if (c <= 0) {
            clearInterval(retryTimerRef.current);
            setRetryCountdown(0);
            // Use retryInit to avoid the 'accessed before declaration' lint error
            if (retryFnRef.current) retryFnRef.current();
          }
        }, 1000);
        return;
      }

      setAppError("Mounting Astra workspace...");
      try {
        const r = await API.get(`/get-chats/${encodeURIComponent(email)}`, { timeout: 15000 });
        if (r.data.length > 0) {
          setChats(r.data);
          setActiveChatId(r.data[0].id);
        } else {
          const cr = await API.post(
            "/create-chat",
            { user_email: email, title: "New Workspace" },
            { timeout: 12000 }
          );
          const nc = { id: cr.data.chat_id, title: "New Workspace", messages: [] };
          setChats([nc]);
          setActiveChatId(nc.id);
        }
        setAppError("");
        await fetchUsage(email);
        setAppLoading(false);
      } catch (e) {
        console.error("fetchChats error:", e);
        setAppLoading(false);
        setAppError("Could not load chats. Tap Retry.");
      }
    },
    [fetchUsage]
  );

  const retryInit = () => {
    if (retryTimerRef.current) clearInterval(retryTimerRef.current);
    setRetryCountdown(0);
    if (user) fetchChats(user.email);
  };
  // Keep retryFnRef in sync with the latest retryInit so fetchChats can call
  // it without a forward-reference hoisting issue
  useEffect(() => {
    retryFnRef.current = retryInit;
  });

  const createNewChat = async () => {
    try {
      const r = await API.post(
        "/create-chat",
        { user_email: user.email, title: "New Workspace" },
        { timeout: 12000 }
      );
      const nc = { id: r.data.chat_id, title: "New Workspace", messages: [] };
      setChats((p) => [nc, ...p]);
      setActiveChatId(nc.id);
      setCurrentPage("chat");
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
    } catch (e) {
      console.error("createNewChat:", e);
    }
  };

  // Auth observer
  useEffect(() => {
    if (isDevGuest) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setProfile({
          nickname: u.displayName || "Astra User",
          email: u.email,
          avatar: u.photoURL,
          is_admin: false, // Admin status resolved server-side via ADMIN_EMAILS env var
        });
        API.defaults.headers.common["X-User-Email"] = u.email;
        fetchChats(u.email);
        startKeepAlive();
        setShowAuthModal(false);
        // Navigate to pending page if any
        if (pendingPageRef.current) {
          setCurrentPage(pendingPageRef.current);
          pendingPageRef.current = null;
        }
      } else {
        stopKeepAlive();
        setUser(null);
        setChats([]);
        setActiveChatId(null);
        delete API.defaults.headers.common["X-User-Email"];
      }
    });
    return () => unsub();
  }, [isDevGuest, fetchChats]);

  // Sync profile & periodic usage polling
  useEffect(() => {
    if (user?.email) {
      const i = setInterval(() => fetchUsage(user.email), 15000);
      return () => clearInterval(i);
    }
  }, [user, fetchUsage]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error("Google login failed:", e);
    }
  };

  const handleEmailLogin = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const handleEmailSignup = async (email, password) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const handlePasswordReset = async (email) => {
    await sendPasswordResetEmail(auth, email);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setChats([]);
    setActiveChatId(null);
    setProfile(null);
    setCurrentPage("chat");
  };

  const activeChat = chats.find((c) => c.id === activeChatId);

  // 1. PUBLIC LANDING PAGE (Unauthenticated visitors)
  if (!user) {
    prewarm();
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
          onStartFree={() => { setAuthModalMode("login"); setShowAuthModal(true); }}
          onGetPass={() => { pendingPageRef.current = "pricing"; setAuthModalMode("login"); setShowAuthModal(true); }}
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

  // 2. LOADING SKELETON
  if (appLoading && chats.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center px-4 bg-[var(--void)]">
        <div className="text-center w-full max-w-sm p-8 glass-panel animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-[var(--astra-glow)] border border-[var(--edge)] flex items-center justify-center mx-auto mb-5 text-[var(--astra-cyan)]">
            <Sparkles size={22} className="animate-spin" />
          </div>
          <p className="text-xs font-semibold mb-1 text-[var(--ink-2)]">
            {appError || "Initializing Astra AI..."}
          </p>
          <p className="text-[11px] text-[var(--ink-3)]">Connecting to multi-agent inference engine</p>
          <div className="mt-5 h-1 w-full rounded-full overflow-hidden bg-white/5">
            <div className="h-full w-1/2 rounded-full animate-pulse bg-gradient-to-r from-[var(--astra-cyan)] to-[var(--royal-violet)]" />
          </div>
        </div>
      </div>
    );
  }

  // 3. CONNECTION ERROR SCREEN
  if (appError && chats.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center px-4 bg-[var(--void)]">
        <div className="text-center max-w-sm w-full p-8 glass-panel">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4 text-red-400">
            <AlertCircle size={22} />
          </div>
          <h3 className="text-sm font-bold mb-1 text-[var(--ink-1)]">Connection Timeout</h3>
          <p className="text-xs mb-5 text-[var(--ink-3)]">{appError}</p>
          {retryCountdown > 0 && (
            <p className="text-xs font-mono font-bold mb-3 text-[var(--astra-cyan)]">
              Auto-retry in {retryCountdown}s
            </p>
          )}
          <button
            onClick={retryInit}
            className="btn-astra w-full flex items-center justify-center gap-2 mb-2"
          >
            <RefreshCw size={13} /> Retry Connection
          </button>
          <button onClick={handleLogout} className="btn-ghost w-full">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // 4. MAIN ASTRA WORKSPACE
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
