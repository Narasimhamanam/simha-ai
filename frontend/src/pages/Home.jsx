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
  const retryCountRef = useRef(0);

  // ── Fetch chats with retry ──────────────────────────────────────────────
  const fetchChats = useCallback(async (email, attempt = 1) => {
    setAppLoading(true);
    setAppError("");

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

      retryCountRef.current = 0;
      setAppError("");
    } catch (error) {
      console.error("fetchChats error:", error);

      if (attempt <= 3) {
        // Retry with backoff: 3s, 6s, 10s
        const delay = attempt * 3000;
        setAppError(`Connecting to server... (attempt ${attempt}/3)`);
        setTimeout(() => fetchChats(email, attempt + 1), delay);
        return;
      }

      // All retries failed — show actionable error
      setAppError("Could not connect to the server. Tap 'Retry' to try again.");
    } finally {
      if (attempt <= 3) setAppLoading(false);
    }
  }, []);

  const retryInit = () => {
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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        stopKeepAlive();
        setChats([]);
        setActiveChatId(null);
        return;
      }
      startKeepAlive();
      await fetchChats(currentUser.email);
    });
    return () => unsubscribe();
  }, [isDevGuest, fetchChats]);

  // ── Profile ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const saved = localStorage.getItem(`simha_profile_${user.email}`);
    setProfile(saved ? JSON.parse(saved) : { nickname: user.displayName, email: user.email, avatar: user.photoURL });
  }, [user]);

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
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center mx-auto mb-5">
            <span className="text-white text-xl font-bold">S</span>
          </div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "0s" }} />
            <div className="w-2 h-2 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: "0.15s" }} />
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0.3s" }} />
          </div>
          <p className="text-sm text-gray-400">
            {appError || "Loading your workspace..."}
          </p>
          <p className="text-xs text-gray-600 mt-1.5">Waking up the AI server — this takes up to 30s on first load</p>
        </div>
      </div>
    );
  }

  if (appError && chats.length === 0) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-[#0a0a0a] px-4">
        <div className="text-center max-w-xs">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-400 text-xl">⚠</span>
          </div>
          <h2 className="text-white font-semibold mb-2">Connection Failed</h2>
          <p className="text-gray-400 text-sm mb-6">{appError}</p>
          <button
            onClick={retryInit}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition touch-manipulation w-full"
          >
            🔄 Retry Connection
          </button>
          <button
            onClick={handleLogout}
            className="mt-3 text-xs text-gray-600 hover:text-gray-400 transition"
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

      {currentPage === "email" && (
        <EmailComposer theme={theme} profile={profile} onClose={() => setCurrentPage("chat")} />
      )}
      {currentPage === "calendar" && (
        <CalendarComposer theme={theme} profile={profile} onClose={() => setCurrentPage("chat")} />
      )}
      {currentPage === "url" && (
        <UrlSummarizer theme={theme} onClose={() => setCurrentPage("chat")} />
      )}

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header
          theme={theme}
          setTheme={setTheme}
          profile={profile}
          setIsSidebarOpen={setIsSidebarOpen}
          activeChat={activeChat}
        />

        {currentPage === "chat" && (
          <ChatArea
            theme={theme}
            chats={chats}
            setChats={setChats}
            activeChat={activeChat}
            activeChatId={activeChatId}
            user={user}
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
