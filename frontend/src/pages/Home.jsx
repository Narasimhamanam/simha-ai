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
import { Sparkles, AlertCircle, RefreshCw, ShieldCheck, ArrowRight } from "lucide-react";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  "https://simha-ai-backend.onrender.com";

const prewarm = () => fetch(`${BACKEND_URL}/ping`).catch(() => {});

function Home() {
  const [theme, setTheme] = useState("dark");
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [appLoading, setAppLoading] = useState(false);
  const [appError, setAppError] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("study");
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  useEffect(() => {
    if (selectedAgent === "divine") {
      setIsMusicPlaying(true);
    } else {
      setIsMusicPlaying(false);
    }
  }, [selectedAgent]);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [theme]);

  useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 1024) setIsSidebarOpen(true);
      else setIsSidebarOpen(false);
    };
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

  const warmUpBackend = async () => {
    for (let i = 0; i < 20; i++) {
      try {
        await API.get("/ping", { timeout: 10000 });
        return true;
      } catch {
        if (i < 19) {
          const secondsLeft = (19 - i) * 5;
          setAppError(`⏳ Waking up AI inference cluster... (${secondsLeft}s)`);
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
    }
    return false;
  };

  const [retryCountdown, setRetryCountdown] = useState(0);
  const retryTimerRef = useRef(null);

  const fetchChats = useCallback(async (email) => {
    setAppLoading(true);
    setAppError("Connecting to Simha Autonomous Multi-Agent OS...");

    const alive = await warmUpBackend();
    if (!alive) {
      setAppLoading(false);
      setAppError("Could not reach backend services. Please check your connection.");
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

    setAppError("Mounting vector stores and workspace...");

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
          const createRes = await API.post("/create-chat", {
            user_email: email,
            title: "New Chat",
          }, { timeout: 15000 });
          const newChat = { id: createRes.data.chat_id, title: "New Chat", messages: [] };
          setChats([newChat]);
          setActiveChatId(newChat.id);
        }

        setAppError("");
        await fetchCredits(email);
        setAppLoading(false);
        return;
      } catch (err) {
        console.error(`fetchChats attempt ${attempt + 1} failed:`, err);
      }
    }

    setAppLoading(false);
    setAppError("Could not connect after several attempts. Please tap Retry.");
  }, [fetchCredits]);

  const retryInit = () => {
    if (retryTimerRef.current) clearInterval(retryTimerRef.current);
    setRetryCountdown(0);
    if (user) fetchChats(user.email);
  };

  const createNewChat = async () => {
    try {
      const res = await API.post("/create-chat", { user_email: user.email, title: "New Chat" }, { timeout: 15000 });
      const newChat = { id: res.data.chat_id, title: "New Chat", messages: [] };
      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(newChat.id);
      setCurrentPage("chat");
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
    } catch (error) {
      console.error("createNewChat error:", error);
    }
  };

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

  useEffect(() => {
    if (!user) return;
    const saved = localStorage.getItem(`simha_profile_${user.email}`);
    setProfile(saved ? JSON.parse(saved) : { nickname: user.displayName, email: user.email, avatar: user.photoURL });
  }, [user]);

  useEffect(() => {
    if (user?.email) {
      const interval = setInterval(() => fetchCredits(user.email), 10000);
      return () => clearInterval(interval);
    }
  }, [user, fetchCredits]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setChats([]);
    setActiveChatId(null);
    setProfile(null);
  };

  const activeChat = chats.find((c) => c.id === activeChatId);

  // ── 1. LUXURY 3D LOGIN SCREEN ──
  if (!user) {
    prewarm();

    return (
      <div className="fixed inset-0 flex items-center justify-center bg-dark-base overflow-hidden text-slate-100">
        
        {/* Cinematic Backdrop with Subtle Mesh */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          <img
            src="/narasimha-hero.png"
            alt="Simha"
            className="w-full h-full object-cover object-center opacity-30 scale-105 filter blur-[1px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-dark-base via-dark-base/80 to-transparent" />
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-dark-base/60 to-dark-base" />
        </div>

        {/* Floating 3D Login Card */}
        <div className="relative z-10 w-full max-w-[420px] mx-4 sm:mx-6 p-8 sm:p-10 rounded-3xl depth-level-4 animate-fade-in">
          
          {/* Logo */}
          <div className="w-14 h-14 rounded-2xl bg-gold-500/15 border border-gold-500/30 flex items-center justify-center mb-6 shadow-lg shadow-gold-500/10">
            <img src="/logo-lion.png" alt="Simha Logo" className="w-8 h-8 object-contain logo-mask" />
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Simha AI
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold tracking-wider bg-gold-500/20 text-gold-400 border border-gold-500/30">
                PRO 3D
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Autonomous multi-agent intelligence platform for research, engineering & workflow execution.
            </p>
          </div>

          {/* Google Sign-in Trigger */}
          <button
            onClick={handleGoogleLogin}
            className="w-full group btn-gold flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl shadow-xl shadow-gold-500/20"
          >
            <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
              <path fill="#000" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#000" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#000" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#000" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"/>
            </svg>
            <span>CONTINUE WITH GOOGLE</span>
          </button>

          {/* Inspirational Bhagavad Gita quote */}
          <div className="mt-8 pt-6 border-t border-white/[0.08] text-center">
            <p className="font-['Playfair_Display'] italic text-gold-300/75 text-xs leading-relaxed">
              “Perform your prescribed duty, for action is indeed better than inaction.”
            </p>
            <span className="text-[10px] text-gold-500/50 uppercase tracking-widest font-bold block mt-1">
              — Bhagavad Gita 3.8
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── 2. INITIALIZING LOADING SKELETON ──
  if (appLoading && chats.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-dark-base px-4 text-white">
        <div className="text-center w-full max-w-sm p-8 rounded-3xl depth-level-3">
          
          <div className="w-14 h-14 rounded-2xl bg-gold-500/15 border border-gold-500/30 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-gold-500/10">
            <img src="/logo-lion.png" alt="Simha Logo" className="w-7 h-7 object-contain logo-mask" />
          </div>

          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-gold-500 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 rounded-full bg-gold-500 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 rounded-full bg-gold-500 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>

          <h3 className="text-sm font-bold text-slate-200 mb-1">
            {appError || "Initializing Simha 3D OS..."}
          </h3>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
            First boot may take a few moments while server clusters and vector indices wake up.
          </p>

          <div className="mt-6 h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-gold-600 via-gold-500 to-gold-400 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // ── 3. CONNECTION ERROR SCREEN ──
  if (appError && chats.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-dark-base px-4 text-white">
        <div className="text-center max-w-sm w-full p-8 rounded-3xl depth-level-3">
          
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center mx-auto mb-5 text-red-500">
            <AlertCircle size={24} />
          </div>

          <h3 className="text-base font-bold text-white mb-1">
            Connection Timeout
          </h3>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            {appError}
          </p>

          {retryCountdown > 0 && (
            <p className="text-gold-500 text-xs font-mono font-semibold mb-4">
              Auto-retrying in {retryCountdown}s...
            </p>
          )}

          <div className="space-y-2">
            <button
              onClick={retryInit}
              className="btn-gold w-full flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} />
              <span>Retry Connection</span>
            </button>
            <button
              onClick={handleLogout}
              className="btn-secondary w-full text-xs"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 4. MAIN 3D WORKSPACE LAYOUT ──
  return (
    <div className="fixed inset-0 flex overflow-hidden text-sm bg-light-base dark:bg-dark-base text-slate-900 dark:text-zinc-100">
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
        selectedAgent={selectedAgent}
        setSelectedAgent={setSelectedAgent}
      />

      <div className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-all duration-300 ${isSidebarOpen ? "lg:ml-[270px]" : "lg:ml-0"}`}>
        <Header
          theme={theme}
          setTheme={setTheme}
          profile={profile}
          setIsSidebarOpen={setIsSidebarOpen}
          isSidebarOpen={isSidebarOpen}
          activeChat={activeChat}
          currentPage={currentPage}
          createNewChat={createNewChat}
          credits={credits}
          isPro={isPro}
          selectedAgent={selectedAgent}
          isMusicPlaying={isMusicPlaying}
          setIsMusicPlaying={setIsMusicPlaying}
        />

        {currentPage === "chat" && (
          <ChatArea
            theme={theme}
            chats={chats}
            setChats={setChats}
            activeChat={activeChat}
            activeChatId={activeChatId}
            user={user}
            fetchCredits={() => fetchCredits(user?.email)}
            selectedAgent={selectedAgent}
            setSelectedAgent={setSelectedAgent}
            isMusicPlaying={isMusicPlaying}
            setIsMusicPlaying={setIsMusicPlaying}
          />
        )}

        {/* Ambient YouTube Audio for Krishna AI */}
        {selectedAgent === "divine" && isMusicPlaying && (
          <div className="hidden pointer-events-none opacity-0 invisible" aria-hidden="true">
            <iframe
              width="1"
              height="1"
              src={`https://www.youtube.com/embed/GnjPoRXYxaM?autoplay=1&mute=0&loop=1&playlist=GnjPoRXYxaM&controls=0`}
              title="Divine Flute"
              allow="autoplay"
            />
          </div>
        )}

        {currentPage === "email" && (
          <EmailComposer
            theme={theme}
            profile={profile}
            onClose={() => setCurrentPage("chat")}
            credits={credits}
            isPro={isPro}
            fetchCredits={() => fetchCredits(user?.email)}
          />
        )}

        {currentPage === "calendar" && (
          <CalendarComposer
            theme={theme}
            profile={profile}
            onClose={() => setCurrentPage("chat")}
            credits={credits}
            isPro={isPro}
            fetchCredits={() => fetchCredits(user?.email)}
          />
        )}

        {currentPage === "url" && (
          <UrlSummarizer
            theme={theme}
            onClose={() => setCurrentPage("chat")}
            credits={credits}
            isPro={isPro}
            fetchCredits={() => fetchCredits(user?.email)}
            userEmail={user?.email}
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
          <SettingsPage
            theme={theme}
            profile={profile}
            setProfile={setProfile}
          />
        )}
      </div>
    </div>
  );
}

export default Home;
