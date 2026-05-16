import { Menu } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const PAGE_TITLES = {
  chat: null, // handled separately
  email: "✉️ Email Composer",
  calendar: "📅 AI Scheduler",
  url: "🌐 URL Summarizer",
  history: "📜 Chat History",
  documents: "📄 Documents",
  settings: "⚙️ Settings",
};

function Header({ theme, setTheme, profile, setIsSidebarOpen, activeChat, currentPage }) {
  const dark = theme === "dark";
  const greeting = getGreeting();
  const firstName = profile?.nickname?.split(" ")[0] || "";
  const chatTitle = activeChat?.title && activeChat.title !== "New Chat" ? activeChat.title : null;
  const pageTitle = PAGE_TITLES[currentPage];

  return (
    <div className={`flex items-center justify-between px-4 md:px-5 py-3 border-b sticky top-0 z-10 backdrop-blur-md ${
      dark ? "bg-[#0a0a0a]/80 border-gray-900" : "bg-white/80 border-gray-100"
    }`}>
      {/* LEFT */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile menu toggle — always visible */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className={`p-1.5 rounded-lg md:hidden transition touch-manipulation ${
            dark ? "text-gray-400 hover:bg-white/5 hover:text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          }`}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0">
          {pageTitle ? (
            /* Non-chat page: show page name */
            <>
              <h1 className={`text-sm font-semibold truncate ${dark ? "text-white" : "text-gray-900"}`}>
                {pageTitle}
              </h1>
              <p className={`text-[11px] ${dark ? "text-gray-600" : "text-gray-400"}`}>
                Simha AI
              </p>
            </>
          ) : chatTitle ? (
            /* Chat page with a named conversation */
            <>
              <h1 className={`text-sm font-semibold truncate max-w-[160px] sm:max-w-xs ${dark ? "text-white" : "text-gray-900"}`}>
                {chatTitle}
              </h1>
              <p className={`text-[11px] ${dark ? "text-gray-600" : "text-gray-400"}`}>
                {greeting}{firstName ? `, ${firstName}` : ""}
              </p>
            </>
          ) : (
            /* Chat page, new/empty chat */
            <>
              <h1 className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>
                {greeting}{firstName ? `, ${firstName}` : ""} 👋
              </h1>
              <p className={`text-[11px] ${dark ? "text-gray-600" : "text-gray-400"}`}>
                How can I help you today?
              </p>
            </>
          )}
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-2">
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>
    </div>
  );
}

export default Header;
