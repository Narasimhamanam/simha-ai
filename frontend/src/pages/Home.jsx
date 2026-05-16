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
  const retryCountRef = useRef(0);

  const fetchCredits = useCallback(async (email) => {
    if (!email) return;
    try {
      const res = await API.get(`/user-credits/${email}`);
      setCredits(res.data.credits);
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
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-[#0a0a0a] px-4">
        <div className="w-full max-w-sm bg-[#141414] border border-gray-800 p-8 rounded-2xl shadow-2xl text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-purple-500/30">
            <span className="text-white text-xl font-bold">S</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1.5">Simha AI</h1>
          <p className="text-sm text-gray-500 mb-8">Your intelligent multi-agent assistant</p>
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 active:bg-gray-100 transition-all text-gray-900 py-3 rounded-xl font-medium text-sm touch-manipulation"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>
          <p className="text-xs text-gray-700 mt-5">By continuing, you agree to our Terms of Service</p>
        </div>
      </div>
    );
  }

  // ── APP LOADING / ERROR SCREEN ──────────────────────────────────────────
  if (appLoading && chats.length === 0) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-[#0a0a0a] px-4">
        <div className="text-center w-full max-w-xs">
          {/* Logo */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/30">
            <span className="text-white text-2xl font-bold">S</span>
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
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-[#0a0a0a] px-4">
        <div className="text-center max-w-xs w-full">
          <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-5">
            <span className="text-red-400 text-2xl">⚠️</span>
          </div>
          <h2 className="text-white font-bold text-lg mb-2">Connection Failed</h2>
          <p className="text-gray-400 text-sm mb-2 leading-relaxed">{appError}</p>
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
    <div className="h-screen h-[100dvh] flex overflow-hidden text-sm bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100">
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
            fetchCredits={() => fetchCredits(user?.email)}
          />
        )}
        {currentPage === "email" && (
          <EmailComposer theme={theme} profile={profile} onClose={() => setCurrentPage("chat")} credits={credits} fetchCredits={() => fetchCredits(user?.email)} />
        )}
        {currentPage === "calendar" && (
          <CalendarComposer theme={theme} profile={profile} onClose={() => setCurrentPage("chat")} credits={credits} fetchCredits={() => fetchCredits(user?.email)} />
        )}
        {currentPage === "url" && (
          <UrlSummarizer theme={theme} onClose={() => setCurrentPage("chat")} credits={credits} fetchCredits={() => fetchCredits(user?.email)} userEmail={user?.email} />
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
