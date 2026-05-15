import { Menu } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function Header({ theme, setTheme, profile, setIsSidebarOpen, activeChat }) {
  const dark = theme === "dark";
  const greeting = getGreeting();
  const firstName = profile?.nickname?.split(" ")[0] || "";
  const chatTitle = activeChat?.title && activeChat.title !== "New Chat" ? activeChat.title : null;

  return (
    <div className={`flex items-center justify-between px-4 md:px-5 py-3 border-b sticky top-0 z-10 backdrop-blur-md ${
      dark ? "bg-[#0a0a0a]/80 border-gray-900" : "bg-white/80 border-gray-100"
    }`}>
      {/* LEFT */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile menu toggle */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className={`p-1.5 rounded-lg md:hidden transition ${
            dark ? "text-gray-400 hover:bg-white/5 hover:text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <Menu size={18} />
        </button>

        <div className="min-w-0">
          {chatTitle ? (
            <>
              <h1 className={`text-sm font-semibold truncate max-w-xs ${dark ? "text-white" : "text-gray-900"}`}>
                {chatTitle}
              </h1>
              <p className={`text-[11px] ${dark ? "text-gray-600" : "text-gray-400"}`}>
                {greeting}{firstName ? `, ${firstName}` : ""}
              </p>
            </>
          ) : (
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
