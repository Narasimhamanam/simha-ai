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
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [appLoading, setAppLoading] = useState(false); // true while fetching chats after login
  const [appError, setAppError] = useState("");        // error message during init
  const [selectedAgent, setSelectedAgent] = useState("study");
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  // Auto-play music when switching to Divine Mode
  useEffect(() => {
    if (selectedAgent === "divine") {
      setIsMusicPlaying(true);
    } else {
      setIsMusicPlaying(false);
    }
  }, [selectedAgent]);

  useEffect(() => { document.documentElement.classList.add("dark"); }, []);
  useEffect(() => {
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [theme]);

  // Default sidebar state based on screen size
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
      <div className="fixed inset-0 flex items-center justify-center md:justify-start bg-[#050301] overflow-hidden font-['Outfit']">
        {/* Cinematic Divine Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <img 
            src="/narasimha-hero.png" 
            alt="Divine Guardian" 
            className="w-full h-full object-cover object-center md:object-cover opacity-90 scale-105 animate-[cinematic-zoom_30s_ease-in-out_infinite_alternate]"
          />
          {/* Depth Overlays */}
          <div className="absolute inset-0 bg-gradient-to-b md:bg-gradient-to-r from-[#050301] via-transparent to-transparent opacity-80" />
          <div className="absolute inset-0 bg-black/40 md:bg-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050301] via-transparent to-transparent opacity-60" />
          
          {/* Subtle Particles Overlay */}
          <div className="absolute inset-0 particles-bg opacity-[0.15] mix-blend-screen" />
          
          {/* Floating Dust Effect Simulation */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div 
                key={i}
                className="absolute w-1 h-1 bg-amber-400/20 rounded-full blur-[1px]"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animation: `gold-float ${15 + i * 2}s infinite ease-in-out`
                }}
              />
            ))}
          </div>
        </div>

        {/* Login Card - Centered on Mobile, Left on Desktop */}
        <div className="relative z-10 w-full max-w-[380px] md:max-w-[460px] mx-auto md:mx-0 md:ml-24 animate-in fade-in slide-in-from-bottom-8 md:slide-in-from-left-16 duration-1000">
          <div className="glass-luxury rounded-[32px] md:rounded-[48px] p-8 md:p-14 border border-amber-500/10 shadow-[0_0_100px_-20px_rgba(245,158,11,0.15)] group">
            
            {/* Animated Golden Shimmer Border */}
            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700">
              <div className="absolute inset-0 animate-shimmer" />
            </div>

            {/* Logo Icon */}
            <div className="w-16 h-16 md:w-20 md:h-20 mb-8 md:mb-10 transform hover:rotate-[10deg] transition-all duration-700 mx-auto md:mx-0">
              <img src="/logo-lion.png" alt="Simha AI Logo" className="w-full h-full object-contain logo-mask filter drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
            </div>

            <h1 className="text-4xl md:text-5xl font-black mb-3 md:mb-4 tracking-tighter text-gold-gradient text-center md:text-left">
              Simha AI
            </h1>
            
            <p className="text-amber-100/80 text-sm md:text-base mb-10 md:mb-14 font-medium leading-relaxed tracking-wide text-center md:text-left">
              Where Divine Strength meets<br/>Artificial Intelligence.
            </p>

            <button
              onClick={handleGoogleLogin}
              className="w-full btn-gold-shine group flex items-center justify-center gap-3 md:gap-4 py-4 md:py-5 px-6 md:px-8 rounded-xl md:rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 text-black font-black hover:from-amber-500 hover:to-amber-400 active:scale-95 transition-all duration-300 shadow-2xl shadow-amber-900/40 border border-amber-400/50 text-[13px] md:text-base"
            >
              <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                <path fill="#000" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#000" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#000" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#000" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"/>
              </svg>
              CONTINUE WITH GOOGLE
            </button>

            {/* Divine Quote Section */}
            <div className="mt-12 md:mt-16 pt-8 md:pt-10 border-t border-amber-500/10 text-center md:text-left">
              <p className="font-['Playfair_Display'] italic text-amber-200/60 text-sm leading-relaxed mb-2 drop-shadow-sm">
                “Fear not, my devotee. I stand beside those who walk with courage and faith.”
              </p>
              <p className="text-[10px] text-amber-500/40 uppercase tracking-[0.4em] font-black">
                — Lord Narasimha
              </p>
            </div>
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
          <div className="w-16 h-16 rounded-[22px] bg-gradient-to-br from-amber-600 to-amber-400 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-amber-500/20 overflow-hidden p-3">
            <img src="/logo-lion.png" alt="S" className="w-full h-full object-contain logo-mask scale-125" />
          </div>

          {/* Animated dots */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full animate-bounce bg-amber-500"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>

          {/* Status message — updates in real-time */}
          <p className="text-sm text-amber-500 font-black uppercase tracking-widest mb-2">
            {appError || "Loading your workspace..."}
          </p>
          <p className="text-[10px] text-amber-500/40 uppercase tracking-widest">
            ☕ First load can take up to 60s while the server wakes up
          </p>

          {/* Animated progress bar */}
          <div className="mt-8 h-1 w-48 mx-auto rounded-full bg-white/5 overflow-hidden">
            <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-amber-600 to-amber-400 animate-pulse" />
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
          <p className="text-amber-100/40 text-sm mb-6 leading-relaxed">{appError}</p>
          {retryCountdown > 0 && (
            <p className="text-amber-500 text-xs mb-5 font-bold tracking-widest">
              AUTO-RETRYING IN {retryCountdown}S...
            </p>
          )}
          <button
            onClick={retryInit}
            className="px-6 py-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-400 text-black text-sm font-black tracking-widest hover:opacity-90 active:scale-95 transition touch-manipulation w-full mb-4 shadow-xl shadow-amber-500/20"
          >
            🔄 RETRY NOW
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
        selectedAgent={selectedAgent}
        setSelectedAgent={setSelectedAgent}
      />

      <div className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-all duration-500 ${isSidebarOpen ? "md:ml-[260px]" : "md:ml-0"}`}>
        {/* Header always visible — hamburger menu works on ALL pages on mobile */}
        <Header
          theme={theme}
          setTheme={setTheme}
          profile={profile}
          setIsSidebarOpen={(val) => {
            if (typeof val === 'function') setIsSidebarOpen(val);
            else setIsSidebarOpen(val);
          }}
          isSidebarOpen={isSidebarOpen}
          activeChat={activeChat}
          currentPage={currentPage}
          createNewChat={createNewChat}
          credits={credits}
          isPro={isPro}
          selectedAgent={selectedAgent}
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
        
        {/* Hidden YouTube Player for Divine Music */}
        {selectedAgent === "divine" && (
          <div className="hidden pointer-events-none opacity-0 invisible">
            <iframe
              width="1"
              height="1"
              src={`https://www.youtube.com/embed/GnjPoRXYxaM?autoplay=${isMusicPlaying ? 1 : 0}&mute=0&loop=1&playlist=GnjPoRXYxaM&controls=0`}
              title="Divine Music"
              allow="autoplay"
            />
          </div>
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
