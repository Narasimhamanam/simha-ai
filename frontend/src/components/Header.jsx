import { Menu, SquarePen } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const PAGE_TITLES = {
  chat: null,
  email: "Email Composer",
  calendar: "AI Scheduler",
  url: "URL Summarizer",
  history: "Chat History",
  documents: "Documents",
  settings: "Settings",
};

const PAGE_EMOJIS = {
  email: "✉️",
  calendar: "📅",
  url: "🌐",
  history: "📜",
  documents: "📄",
  settings: "⚙️",
};

function Header({ theme, setTheme, profile, setIsSidebarOpen, activeChat, currentPage, createNewChat, credits, isPro }) {
  const dark = theme === "dark";
  const firstName = profile?.nickname?.split(" ")[0] || "";
  const chatTitle = activeChat?.title && activeChat.title !== "New Chat" ? activeChat.title : null;
  const pageTitle = PAGE_TITLES[currentPage];
  const pageEmoji = PAGE_EMOJIS[currentPage];

  return (
    <header className={`sticky top-0 z-20 flex items-center justify-between px-6 py-3 h-20 transition-all duration-500 ${
      dark 
        ? "bg-[#080502]/80 backdrop-blur-2xl border-b border-amber-500/10 shadow-lg shadow-black/20" 
        : "bg-[#fffbeb]/80 backdrop-blur-2xl border-b border-amber-200 shadow-sm"
    }`}>
      {/* LEFT — Hamburger */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className={`p-2 rounded-xl transition touch-manipulation ${
          dark ? "text-gray-400 hover:bg-white/8 hover:text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        }`}
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* CENTER — Model/Page title */}
      <div className="flex flex-col items-center">
        {pageTitle ? (
          <span className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>
            {pageEmoji} {pageTitle}
          </span>
        ) : (
          <>
            <span className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>
              {chatTitle
                ? <span className="max-w-[140px] truncate block">{chatTitle}</span>
                : "Simha AI"}
            </span>
            <span className={`text-[10px] ${dark ? "text-gray-600" : "text-gray-400"}`}>
              {firstName ? `${firstName}'s workspace` : "Multi-Agent Assistant"}
            </span>
          </>
        )}
      </div>

      {/* RIGHT — Theme toggle + New chat */}
      <div className="flex items-center gap-1">
        {/* Credits Badge */}
        {(credits !== undefined && credits !== null) && !isPro && (
          <div className={`mr-4 flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black tracking-widest shadow-lg transition-all duration-300 ${
            credits <= 0 
              ? dark ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-red-50 text-red-600 border border-red-100"
              : dark ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-amber-500/5" : "bg-amber-50 text-amber-700 border border-amber-200"
          }`}>
            <span className="animate-pulse">⚡</span>
            {credits.toFixed(1)}
          </div>
        )}
        {/* Pro Badge */}
        {isPro && (
          <div className={`mr-4 flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black tracking-widest shadow-xl transition-all duration-300 ${
            dark 
              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-amber-500/10" 
              : "bg-amber-100 text-amber-800 border border-amber-200"
          }`}>
            <span>👑</span>
            PRO MEMBER
          </div>
        )}
        <ThemeToggle theme={theme} setTheme={setTheme} />
        {currentPage === "chat" && (
          <button
            onClick={createNewChat}
            className={`p-2 rounded-xl transition touch-manipulation ${
              dark ? "text-gray-400 hover:bg-white/8 hover:text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            }`}
            aria-label="New chat"
          >
            <SquarePen size={18} />
          </button>
        )}
      </div>
    </header>
  );
}

export default Header;
