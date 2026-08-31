import { Menu, SquarePen, Volume2, VolumeX, Sparkles, Zap, Shield, Crown } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const PAGE_META = {
  chat: null,
  email: { title: "Email Composer", desc: "Professional AI Email Assistant" },
  calendar: { title: "AI Scheduler", desc: "Smart Calendar Event Parsing" },
  url: { title: "URL Reader", desc: "Web Page Analysis & Summaries" },
  history: { title: "Chat History", desc: "Past Conversations & Insights" },
  documents: { title: "Knowledge Base", desc: "Document & PDF RAG Store" },
  settings: { title: "Preferences", desc: "Account Settings & Profile" },
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

        {/* Dynamic Title / Breadcrumb */}
        <div className="hidden sm:flex items-center gap-2">
          {pageMeta ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                {pageMeta.title}
              </span>
              <span className="text-slate-300 dark:text-zinc-700">•</span>
              <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-normal">
                {pageMeta.desc}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isDivine ? "bg-sky-500" : "bg-emerald-500"} animate-pulse`} />
              <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 max-w-[200px] truncate">
                {chatTitle || (isDivine ? "Krishna AI" : "Simha AI Workspace")}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono text-slate-400 dark:text-zinc-500 bg-slate-100 dark:bg-white/[0.04] border border-slate-200/50 dark:border-white/[0.06]">
                {isDivine ? "Gita 18.78" : "Groq Qwen-27B"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: METRICS & CONTROLS ── */}
      <div className="flex items-center gap-2">
        {/* Credits Balance Indicator */}
        <div
          title={isPro ? "Pro Plan: Unlimited credits" : "Current AI Credits balance"}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-tight transition ${
            credits <= 0 && !isPro
              ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
              : isPro
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              : "bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-zinc-300 border border-slate-200/60 dark:border-white/[0.06]"
          }`}
        >
          {isPro ? (
            <Crown size={12} className="text-amber-500" />
          ) : (
            <Zap size={12} className={credits > 0 ? "text-amber-500" : "text-red-500"} />
          )}
          <span>{isPro ? "Unlimited" : `${Number(credits || 0).toFixed(1)} cr`}</span>
        </div>

        {/* Ambient Divine Flute Audio Toggle */}
        {isDivine && (
          <button
            onClick={() => setIsMusicPlaying(!isMusicPlaying)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition ${
              isMusicPlaying
                ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 shadow-xs"
                : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]"
            }`}
            title={isMusicPlaying ? "Pause ambient sound" : "Play ambient flute"}
          >
            {isMusicPlaying ? (
              <>
                <Volume2 size={13} className="text-sky-500 animate-pulse" />
                <span className="hidden sm:inline text-[11px]">Ambient On</span>
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
            title="Create new chat (⌘N)"
            aria-label="New chat"
          >
            <SquarePen size={16} />
          </button>
        )}

        {/* Dark / Light Mode Toggle */}
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>
    </header>
  );
}

export default Header;
