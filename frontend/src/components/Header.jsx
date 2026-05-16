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

function Header({ theme, setTheme, profile, setIsSidebarOpen, activeChat, currentPage, createNewChat }) {
  const dark = theme === "dark";
  const firstName = profile?.nickname?.split(" ")[0] || "";
  const chatTitle = activeChat?.title && activeChat.title !== "New Chat" ? activeChat.title : null;
  const pageTitle = PAGE_TITLES[currentPage];
  const pageEmoji = PAGE_EMOJIS[currentPage];

  return (
    <div className={`flex items-center justify-between px-3 py-2.5 border-b sticky top-0 z-10 backdrop-blur-md ${
      dark ? "bg-[#0a0a0a]/90 border-gray-900" : "bg-white/90 border-gray-100"
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
    </div>
  );
}

export default Header;
