import { Menu, SquarePen, Volume2, VolumeX, Sparkles, Zap, Shield, Crown } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const PAGE_META = {
  chat: null,
  email: { title: "Email Composer", desc: "Autonomous AI Email Assistant" },
  calendar: { title: "AI Scheduler", desc: "Smart Calendar Event Parsing" },
  url: { title: "URL Reader", desc: "Web Page Analysis & Insights" },
  history: { title: "Chat History", desc: "Conversation Archive & Analytics" },
  documents: { title: "Knowledge Base", desc: "Vector RAG Repository" },
  settings: { title: "Preferences", desc: "Account Settings & LLM Specs" },
};

function Header({
  theme,
  setTheme,
  profile,
  setIsSidebarOpen,
  isSidebarOpen,
  activeChat,
  currentPage,
  createNewChat,
  credits,
  isPro,
  selectedAgent,
  isMusicPlaying,
  setIsMusicPlaying,
}) {
  const isDivine = selectedAgent === "divine";
  const dark = theme === "dark";
  const chatTitle = activeChat?.title && activeChat.title !== "New Chat" ? activeChat.title : null;
  const pageMeta = PAGE_META[currentPage];

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 h-14 transition-all duration-200 glass-header">
      {/* ── LEFT: SIDEBAR TOGGLE & CONTEXT ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
          aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <Menu size={18} />
        </button>

        {/* Dynamic Context Breadcrumb */}
        <div className="hidden sm:flex items-center gap-2">
          {pageMeta ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                {pageMeta.title}
              </span>
              <span className="text-slate-300 dark:text-zinc-700">•</span>
              <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-normal">
                {pageMeta.desc}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isDivine ? "bg-cyan-500" : "bg-gold-500"} animate-pulse`} />
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 max-w-[220px] truncate">
                {chatTitle || (isDivine ? "Krishna AI Workspace" : "Simha AI OS")}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold text-slate-400 dark:text-zinc-400 bg-slate-100 dark:bg-white/[0.05] border border-slate-200/50 dark:border-white/[0.06]">
                {isDivine ? "Gita Wisdom" : "Qwen-27B"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: CREDITS & CONTROLS ── */}
      <div className="flex items-center gap-2">
        {/* Credits Balance Pill */}
        <div
          title={isPro ? "Pro Plan: Unlimited inference credits" : "Current AI Credits balance"}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-tight transition ${
            credits <= 0 && !isPro
              ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
              : isPro
              ? "bg-gold-500/15 text-gold-600 dark:text-gold-400 border border-gold-500/30"
              : "bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-zinc-300 border border-slate-200/60 dark:border-white/[0.06]"
          }`}
        >
          {isPro ? (
            <Crown size={12} className="text-gold-500" />
          ) : (
            <Zap size={12} className={credits > 0 ? "text-gold-500" : "text-red-500"} />
          )}
          <span>{isPro ? "Unlimited" : `${Number(credits || 0).toFixed(1)} cr`}</span>
        </div>

        {/* Krishna AI Ambient Flute Toggle */}
        {isDivine && (
          <button
            onClick={() => setIsMusicPlaying(!isMusicPlaying)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
              isMusicPlaying
                ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-sm"
                : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]"
            }`}
            title={isMusicPlaying ? "Pause ambient flute" : "Play ambient flute"}
          >
            {isMusicPlaying ? (
              <>
                <Volume2 size={13} className="text-cyan-500 animate-pulse" />
                <span className="hidden sm:inline text-[11px]">Flute On</span>
              </>
            ) : (
              <VolumeX size={13} />
            )}
          </button>
        )}

        {/* New Chat Quick Action */}
        {currentPage === "chat" && (
          <button
            onClick={createNewChat}
            className="p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
            title="Create new workspace (⌘N)"
            aria-label="New chat"
          >
            <SquarePen size={16} />
          </button>
        )}

        {/* Theme Switcher */}
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>
    </header>
  );
}

export default Header;
