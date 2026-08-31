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
import SimhaCanvas3D from "../components/3d/SimhaCanvas3D";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, provider } from "../firebase";
import API from "../services/api";
import { startKeepAlive, stopKeepAlive } from "../services/keepAlive";
import { motion } from "framer-motion";
import { AlertCircle, RefreshCw } from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://simha-ai-backend.onrender.com";
const prewarm = () => fetch(`${BACKEND_URL}/ping`).catch(() => {});

function Home() {
  const [theme, setTheme] = useState("dark");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // collapsed by default in Zero-G
  const [appLoading, setAppLoading] = useState(false);
  const [appError, setAppError] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("study");
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  useEffect(() => { setIsMusicPlaying(selectedAgent === "divine"); }, [selectedAgent]);
  useEffect(() => { document.documentElement.classList.add("dark"); }, []);
  useEffect(() => { if (theme === "dark") document.documentElement.classList.add("dark"); else document.documentElement.classList.remove("dark"); }, [theme]);

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
    try { const r = await API.get(`/user-credits/${email}`); setCredits(r.data.credits); setIsPro(r.data.is_pro); } catch {}
  }, []);

  const warmUpBackend = async () => {
    for (let i = 0; i < 20; i++) {
      try { await API.get("/ping", { timeout: 10000 }); return true; }
      catch { if (i < 19) { setAppError(`Waking inference cluster... (${(19 - i) * 5}s)`); await new Promise(r => setTimeout(r, 5000)); } }
    }
    return false;
  };

  const [retryCountdown, setRetryCountdown] = useState(0);
  const retryTimerRef = useRef(null);

  const fetchChats = useCallback(async (email) => {
    setAppLoading(true);
    setAppError("Connecting to Simha AI...");
    const alive = await warmUpBackend();
    if (!alive) {
      setAppLoading(false);
      setAppError("Could not reach backend.");
      let c = 30; setRetryCountdown(c);
      retryTimerRef.current = setInterval(() => { c--; setRetryCountdown(c); if (c <= 0) { clearInterval(retryTimerRef.current); setRetryCountdown(0); fetchChats(email); } }, 1000);
      return;
    }
    setAppError("Mounting workspace...");
    const DELAYS = [0, 4000, 7000, 10000, 15000];
    for (let a = 0; a < DELAYS.length; a++) {
      if (a > 0) { setAppError(`Connecting... (${a + 1}/${DELAYS.length})`); await new Promise(r => setTimeout(r, DELAYS[a])); }
      try {
        const r = await API.get(`/get-chats/${encodeURIComponent(email)}`, { timeout: 20000 });
        if (r.data.length > 0) { setChats(r.data); setActiveChatId(r.data[0].id); }
        else { const cr = await API.post("/create-chat", { user_email: email, title: "New Chat" }, { timeout: 15000 }); const nc = { id: cr.data.chat_id, title: "New Chat", messages: [] }; setChats([nc]); setActiveChatId(nc.id); }
        setAppError(""); await fetchCredits(email); setAppLoading(false); return;
      } catch (e) { console.error(`fetchChats attempt ${a + 1} failed:`, e); }
    }
    setAppLoading(false);
    setAppError("Could not connect. Tap Retry.");
  }, [fetchCredits]);

  const retryInit = () => { if (retryTimerRef.current) clearInterval(retryTimerRef.current); setRetryCountdown(0); if (user) fetchChats(user.email); };

  const createNewChat = async () => {
    try {
      const r = await API.post("/create-chat", { user_email: user.email, title: "New Chat" }, { timeout: 15000 });
      const nc = { id: r.data.chat_id, title: "New Chat", messages: [] };
      setChats(p => [nc, ...p]); setActiveChatId(nc.id); setCurrentPage("chat");
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
    } catch (e) { console.error("createNewChat:", e); }
  };

  useEffect(() => {
    if (isDevGuest) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) { setUser(u); setProfile({ nickname: u.displayName || "User", email: u.email }); fetchChats(u.email); startKeepAlive(); }
      else { stopKeepAlive(); setUser(null); setChats([]); setActiveChatId(null); }
    });
    return () => unsub();
  }, [isDevGuest, fetchChats]);

  useEffect(() => { if (!user) return; const s = localStorage.getItem(`simha_profile_${user.email}`); setProfile(s ? JSON.parse(s) : { nickname: user.displayName, email: user.email, avatar: user.photoURL }); }, [user]);
  useEffect(() => { if (user?.email) { const i = setInterval(() => fetchCredits(user.email), 10000); return () => clearInterval(i); } }, [user, fetchCredits]);

  const handleGoogleLogin = async () => { try { await signInWithPopup(auth, provider); } catch (e) { console.error("Login:", e); } };
  const handleLogout = async () => { await signOut(auth); setChats([]); setActiveChatId(null); setProfile(null); };

  const activeChat = chats.find(c => c.id === activeChatId);

  /* ══════════════════════════════════════════════════════════════
     1. LOGIN — FULL-VIEWPORT 3D LION SCENE
     ══════════════════════════════════════════════════════════════ */
  if (!user) {
    prewarm();
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-end overflow-hidden" style={{ background: "var(--void)" }}>
        {/* Full-bleed 3D lion scene */}
        <div className="absolute inset-0 z-0">
          <SimhaCanvas3D mode="login" selectedAgent="study" />
        </div>

        {/* UI overlay — wordmark + login */}
        <motion.div
          className="relative z-10 w-full flex flex-col items-center pb-12 sm:pb-16 px-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3.5, duration: 0.8, ease: "easeOut" }}
        >
          {/* Wordmark */}
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-1">
            <span className="text-gold-gradient">SIMHA AI</span>
          </h1>
          <p className="text-xs text-[var(--ink-3)] mb-8 tracking-widest uppercase font-semibold">
            Zero-G Sanctum
          </p>

          {/* Google Sign-in capsule */}
          <button
            onClick={handleGoogleLogin}
            className="glass-panel !rounded-full flex items-center justify-center gap-3 px-8 py-3.5 text-xs font-bold tracking-wide transition-all hover:border-[var(--edge-hover)]"
            style={{ color: "var(--ink-1)" }}
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Gita quote */}
          <p className="mt-8 text-center font-divine italic text-xs leading-relaxed max-w-sm" style={{ color: "rgba(214, 168, 79, 0.5)" }}>
            "Perform your prescribed duty, for action is indeed better than inaction."
          </p>
          <span className="text-[10px] uppercase tracking-widest font-bold mt-1" style={{ color: "rgba(214, 168, 79, 0.3)" }}>
            — Bhagavad Gita 3.8
          </span>
        </motion.div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     2. LOADING SKELETON
     ══════════════════════════════════════════════════════════════ */
  if (appLoading && chats.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center px-4" style={{ background: "var(--void)" }}>
        <div className="text-center w-full max-w-sm p-8 glass-panel">
          <div className="w-12 h-12 rounded-2xl bg-[var(--mane-gold-glow)] border border-[rgba(214,168,79,0.2)] flex items-center justify-center mx-auto mb-5">
            <img src="/logo-lion.png" alt="" className="w-6 h-6 object-contain logo-mask" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--mane-gold)] animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--mane-gold)] animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--mane-gold)] animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <p className="text-xs font-semibold mb-1" style={{ color: "var(--ink-2)" }}>{appError || "Initializing..."}</p>
          <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>First boot may take a moment.</p>
          <div className="mt-5 h-1 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="h-full w-1/2 rounded-full animate-pulse" style={{ background: "linear-gradient(90deg, var(--mane-gold), var(--mane-gold-bright))" }} />
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     3. CONNECTION ERROR
     ══════════════════════════════════════════════════════════════ */
  if (appError && chats.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center px-4" style={{ background: "var(--void)" }}>
        <div className="text-center max-w-sm w-full p-8 glass-panel">
          <div className="w-12 h-12 rounded-2xl bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] flex items-center justify-center mx-auto mb-4 text-red-400">
            <AlertCircle size={22} />
          </div>
          <h3 className="text-sm font-bold mb-1" style={{ color: "var(--ink-1)" }}>Connection Timeout</h3>
          <p className="text-xs mb-5" style={{ color: "var(--ink-3)" }}>{appError}</p>
          {retryCountdown > 0 && <p className="text-xs font-mono font-bold mb-3" style={{ color: "var(--mane-gold)" }}>Auto-retry in {retryCountdown}s</p>}
          <button onClick={retryInit} className="btn-gold w-full flex items-center justify-center gap-2 mb-2"><RefreshCw size={13} /> Retry</button>
          <button onClick={handleLogout} className="btn-ghost w-full">Sign out</button>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     4. MAIN WORKSPACE — ASYMMETRIC ZERO-G LAYOUT
     ══════════════════════════════════════════════════════════════ */
  return (
    <div className="fixed inset-0 flex overflow-hidden text-sm" style={{ background: "var(--void)", color: "var(--ink-1)" }}>
      <ConnectionStatus theme={theme} />

      <Sidebar
        theme={theme} chats={chats} setChats={setChats}
        activeChatId={activeChatId} setActiveChatId={setActiveChatId}
        setCurrentPage={setCurrentPage} currentPage={currentPage}
        createNewChat={createNewChat} profile={profile} handleLogout={handleLogout}
        isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
        isPro={isPro} selectedAgent={selectedAgent} setSelectedAgent={setSelectedAgent}
      />

      {/* Main content — offset by rail width on desktop */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-all duration-300 lg:ml-[64px]">
        <Header
          theme={theme} setTheme={setTheme} setIsSidebarOpen={setIsSidebarOpen} isSidebarOpen={isSidebarOpen}
          activeChat={activeChat} currentPage={currentPage} createNewChat={createNewChat}
          credits={credits} isPro={isPro} selectedAgent={selectedAgent} setSelectedAgent={setSelectedAgent}
          isMusicPlaying={isMusicPlaying} setIsMusicPlaying={setIsMusicPlaying}
        />

        {currentPage === "chat" && (
          <ChatArea
            theme={theme} chats={chats} setChats={setChats} activeChat={activeChat} activeChatId={activeChatId}
            user={user} fetchCredits={() => fetchCredits(user?.email)} selectedAgent={selectedAgent} setSelectedAgent={setSelectedAgent}
            isMusicPlaying={isMusicPlaying} setIsMusicPlaying={setIsMusicPlaying}
          />
        )}

        {selectedAgent === "divine" && isMusicPlaying && (
          <div className="hidden" aria-hidden="true">
            <iframe width="1" height="1" src="https://www.youtube.com/embed/GnjPoRXYxaM?autoplay=1&mute=0&loop=1&playlist=GnjPoRXYxaM&controls=0" title="Flute" allow="autoplay" />
          </div>
        )}

        {currentPage === "email" && <EmailComposer theme={theme} profile={profile} onClose={() => setCurrentPage("chat")} credits={credits} isPro={isPro} fetchCredits={() => fetchCredits(user?.email)} />}
        {currentPage === "calendar" && <CalendarComposer theme={theme} profile={profile} onClose={() => setCurrentPage("chat")} credits={credits} isPro={isPro} fetchCredits={() => fetchCredits(user?.email)} />}
        {currentPage === "url" && <UrlSummarizer theme={theme} onClose={() => setCurrentPage("chat")} credits={credits} isPro={isPro} fetchCredits={() => fetchCredits(user?.email)} userEmail={user?.email} />}
        {currentPage === "history" && <ChatHistoryPage theme={theme} chats={chats} setActiveChatId={setActiveChatId} setCurrentPage={setCurrentPage} />}
        {currentPage === "documents" && <DocumentsPage theme={theme} user={user} setActiveChatId={setActiveChatId} setCurrentPage={setCurrentPage} />}
        {currentPage === "settings" && <SettingsPage theme={theme} profile={profile} setProfile={setProfile} />}
      </div>
    </div>
  );
}

export default Home;
