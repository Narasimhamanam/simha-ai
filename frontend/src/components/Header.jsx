import { Menu } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

function Header({ theme, setTheme, profile, setIsSidebarOpen }) {
  return (
    <div className="flex justify-between items-center px-4 md:px-6 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-[#0a0a0a]/50 backdrop-blur-md sticky top-0 z-10">
      {/* LEFT */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 md:hidden rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white leading-tight tracking-tight">
            Good Morning,
            <span className="text-purple-600 dark:text-purple-400">
              {" "}
              {profile?.nickname?.split(" ")[0]}
            </span>
          </h1>
          <p className="mt-0.5 text-gray-500 dark:text-gray-400 text-[13px]">
            How can I help you today?
          </p>
        </div>
      </div>

      {/* RIGHT */}

      <div className="flex items-center gap-3">
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>
    </div>
  );
}

export default Header;
