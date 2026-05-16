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
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, provider } from "../firebase";
import API from "../services/api";
import { startKeepAlive, stopKeepAlive } from "../services/keepAlive";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  "https://simha-ai-production.up.railway.app";

// Pre-warm backend silently (fire and forget)
const prewarm = () => fetch(`${BACKEND_URL}/ping`).catch(() => {});

function Home() {
  const [theme, setTheme] = useState("dark");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [appLoading, setAppLoading] = useState(false); // true while fetching chats after login
  const [appError, setAppError] = useState("");        // error message during init

  useEffect(() => { document.documentElement.classList.add("dark"); }, []);
  useEffect(() => {
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [theme]);

  // Close sidebar on desktop resize
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 768) setIsSidebarOpen(false); };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const isDevGuest = (import.meta.env.VITE_DEV_GUEST || "").toString().toLowerCase() === "true";
  const [user, setUser] = useState(isDevGuest ? { email: "guest@local", displayName: "Guest", photoURL: null } : null);
  const [profile, setProfile] = useState(null);
  const [currentPage, setCurrentPage] = useState("chat");
  const guestChatId = "local-guest-chat";
  const [chats, setChats] = useState(isDevGuest ? [{ id: guestChatId, title: "New Chat", messages: [] }] : []);
  const [activeChatId, setActiveChatId] = useState(isDevGuest ? guestChatId : null);
  const [credits, setCredits] = useState(10);
  const [isPro, setIsPro] = useState(false);
  const retryCountRef = useRef(0);

  const fetchCredits = useCallback(async (email) => {
    if (!email) return;
    try {
      const res = await API.get(`/user-credits/${email}`);
      setCredits(res.data.credits);
      setIsPro(res.data.is_pro);
    } catch (e) {
      console.error("Failed to fetch credits", e);
    }
  }, []);

  // ── Warm up backend before fetching ────────────────────────────────────
  const warmUpBackend = async () => {
    // Try pinging up to 12 times with 5s gaps = 60s total warm-up budget
    // Railway cold starts can take 40-60s for first user
    for (let i = 0; i < 12; i++) {
      try {
        await API.get("/ping", { timeout: 10000 });
        return true; // server is awake
      } catch {
        if (i < 11) {
          const secondsLeft = (11 - i) * 5;
          setAppError(`⏳ Waking up AI server... (${secondsLeft}s)`);
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
    }
    return false; // still not reachable after 60s
  };

  // ── Fetch chats with retry ──────────────────────────────────────────────
  const [retryCountdown, setRetryCountdown] = useState(0);
  const retryTimerRef = useRef(null);

  const fetchChats = useCallback(async (email) => {
    setAppLoading(true);
    setAppError("Starting up AI server... (first load may take 60s)");

    // Step 1: wait for backend to be alive before loading chats
    const alive = await warmUpBackend();
    if (!alive) {
      setAppLoading(false);
      setAppError("Could not reach the server. Please check your connection and try again.");
      // Auto-retry after 30s countdown
      let countdown = 30;
      setRetryCountdown(countdown);
      retryTimerRef.current = setInterval(() => {
        countdown -= 1;
        setRetryCountdown(countdown);
        if (countdown <= 0) {
          clearInterval(retryTimerRef.current);
          setRetryCountdown(0);
          fetchChats(email);
        }
      }, 1000);
      return;
    }

    setAppError("Loading your workspace...");

    // Step 2: try to load chats — 5 retries
    const DELAYS = [0, 4000, 7000, 10000, 15000];
    for (let attempt = 0; attempt < DELAYS.length; attempt++) {
      if (attempt > 0) {
        setAppError(`Connecting... (attempt ${attempt + 1}/${DELAYS.length})`);
        await new Promise((r) => setTimeout(r, DELAYS[attempt]));
      }
      try {
        const res = await API.get(`/get-chats/${encodeURIComponent(email)}`, { timeout: 20000 });

        if (res.data.length > 0) {
          setChats(res.data);
          setActiveChatId(res.data[0].id);
        } else {
          // New user — create first chat
          const createRes = await API.post("/create-chat", {
            user_email: email,
            title: "New Chat",
          }, { timeout: 15000 });
          const newChat = { id: createRes.data.chat_id, title: "New Chat", messages: [] };
          setChats([newChat]);
          setActiveChatId(newChat.id);
        }

        setAppError("");
        
        // Fetch credits
        await fetchCredits(email);

        setAppLoading(false);
        return; // success
      } catch (err) {
        console.error(`fetchChats attempt ${attempt + 1} failed:`, err);
      }
    }

    // All attempts exhausted
    setAppLoading(false);
    setAppError("Could not connect after several attempts. Please tap Retry.");
  }, [fetchCredits]);

  const retryInit = () => {
    if (retryTimerRef.current) clearInterval(retryTimerRef.current);
    setRetryCountdown(0);
    if (user) fetchChats(user.email);
  };

  // ── Create new chat ─────────────────────────────────────────────────────
  const createNewChat = async () => {
    try {
      const res = await API.post("/create-chat", { user_email: user.email, title: "New Chat" }, { timeout: 15000 });
      const newChat = { id: res.data.chat_id, title: "New Chat", messages: [] };
      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(newChat.id);
      setCurrentPage("chat");
      setIsSidebarOpen(false);
    } catch (error) {
      console.error("createNewChat error:", error);
    }
  };

  // ── Auth ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDevGuest) return;
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setProfile({ nickname: u.displayName || "User", email: u.email });
        if (!isDevGuest) fetchChats(u.email);
        startKeepAlive();
      } else {
        stopKeepAlive();
        setUser(null);
        setChats([]);
        setActiveChatId(null);
      }
    });
    return () => unsubscribe();
  }, [isDevGuest, fetchChats]);

  // ── Profile ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const saved = localStorage.getItem(`simha_profile_${user.email}`);
    setProfile(saved ? JSON.parse(saved) : { nickname: user.displayName, email: user.email, avatar: user.photoURL });
  }, [user]);

  useEffect(() => {
    if (user?.email) {
      const interval = setInterval(() => fetchCredits(user.email), 10000); // poll every 10s
      return () => clearInterval(interval);
    }
  }, [user, fetchCredits]);

  const handleGoogleLogin = async () => {
    try { await signInWithPopup(auth, provider); }
    catch (error) { console.error(error); }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setChats([]);
    setActiveChatId(null);
    setProfile(null);
  };

  const activeChat = chats.find((c) => c.id === activeChatId);

  // ── LOGIN SCREEN ────────────────────────────────────────────────────────
  if (!user) {
    // Pre-warm backend as soon as login page shows
    prewarm();

    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#030303] overflow-hidden">
        {/* Animated Cinematic Lion Background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <img 
            src="/neon-lion.png" 
            alt="Cinematic Lion" 
            className="w-[180%] h-[180%] md:w-[120%] md:h-[120%] object-contain opacity-60 animate-lion-walk animate-roar"
          />
          <div className="neural-overlay opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-[#030303] opacity-60" />
          
          {/* Floating Neural Particles Simulation */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] mix-blend-overlay" />
        </div>

        {/* Login Card */}
        <div className="relative z-10 w-full max-w-[400px] mx-4 animate-in fade-in zoom-in duration-1000">
          <div className="glass-effect rounded-[48px] p-12 border border-white/10 shadow-[0_0_80px_-20px_rgba(168,85,247,0.4)] text-center">
            {/* Logo Icon */}
            <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-purple-500/40 transform hover:scale-110 transition-transform duration-500">
              <span className="text-white text-3xl font-black tracking-tighter">S</span>
            </div>

            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Simha AI</h1>
            <p className="text-slate-400 text-sm mb-10 font-medium">Your intelligent multi-agent assistant</p>

            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-white text-black font-bold hover:bg-slate-100 active:scale-95 transition-all duration-300 shadow-xl shadow-white/5"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <p className="text-[10px] text-slate-600 mt-8 uppercase tracking-[0.2em] font-bold">
              By continuing, you agree to our Terms
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── APP LOADING / ERROR SCREEN ──────────────────────────────────────────
  if (appLoading && chats.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#030303] px-4">
        <div className="text-center w-full max-w-xs">
          {/* Logo */}
          <div className="w-16 h-16 rounded-[22px] bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-purple-500/20">
            <span className="text-white text-2xl font-black">S</span>
          </div>

          {/* Animated dots */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full animate-bounce"
                style={{
                  animationDelay: `${i * 0.15}s`,
                  background: ["#a855f7", "#ec4899", "#22d3ee"][i],
                }}
              />
            ))}
          </div>

          {/* Status message — updates in real-time */}
          <p className="text-sm text-gray-300 font-medium mb-2">
            {appError || "Loading your workspace..."}
          </p>
          <p className="text-xs text-gray-600">
            ☕ First load can take up to 60s while the server wakes up
          </p>

          {/* Animated progress bar */}
          <div className="mt-5 h-1 w-48 mx-auto rounded-full bg-gray-800 overflow-hidden">
            <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (appError && chats.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#030303] px-4">
        <div className="text-center max-w-xs w-full">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6 border border-red-500/20">
            <span className="text-red-400 text-2xl">⚠️</span>
          </div>
          <h2 className="text-white font-black text-xl mb-3 tracking-tight">Connection Failed</h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">{appError}</p>
          {retryCountdown > 0 && (
            <p className="text-purple-400 text-xs mb-5">
              Auto-retrying in {retryCountdown}s...
            </p>
          )}
          <button
            onClick={retryInit}
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition touch-manipulation w-full mb-3"
          >
            🔄 Retry Now
          </button>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-600 hover:text-gray-400 transition"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN UI ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 flex overflow-hidden text-sm bg-slate-50 dark:bg-[#030303] text-slate-900 dark:text-slate-100">
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
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header always visible — hamburger menu works on ALL pages on mobile */}
        <Header
          theme={theme}
          setTheme={setTheme}
          profile={profile}
          setIsSidebarOpen={setIsSidebarOpen}
          activeChat={activeChat}
          currentPage={currentPage}
          createNewChat={createNewChat}
          credits={credits}
          isPro={isPro}
        />

        {currentPage === "chat" && (
          <ChatArea
            theme={theme}
            chats={chats}
            setChats={setChats}
            activeChat={activeChat}
            activeChatId={activeChatId}
            user={user}
            credits={credits}
            isPro={isPro}
            fetchCredits={() => fetchCredits(user?.email)}
          />
        )}
        {currentPage === "email" && (
          <EmailComposer theme={theme} profile={profile} onClose={() => setCurrentPage("chat")} credits={credits} isPro={isPro} fetchCredits={() => fetchCredits(user?.email)} />
        )}
        {currentPage === "calendar" && (
          <CalendarComposer theme={theme} profile={profile} onClose={() => setCurrentPage("chat")} credits={credits} isPro={isPro} fetchCredits={() => fetchCredits(user?.email)} />
        )}
        {currentPage === "url" && (
          <UrlSummarizer theme={theme} onClose={() => setCurrentPage("chat")} credits={credits} isPro={isPro} fetchCredits={() => fetchCredits(user?.email)} userEmail={user?.email} />
        )}
        {currentPage === "history" && (
          <ChatHistoryPage
            theme={theme}
            chats={chats}
            setActiveChatId={setActiveChatId}
            setCurrentPage={setCurrentPage}
          />
        )}
        {currentPage === "documents" && (
          <DocumentsPage
            theme={theme}
            user={user}
            setActiveChatId={setActiveChatId}
            setCurrentPage={setCurrentPage}
          />
        )}
        {currentPage === "settings" && (
          <SettingsPage theme={theme} profile={profile} setProfile={setProfile} />
        )}
      </div>
    </div>
  );
}

export default Home;
