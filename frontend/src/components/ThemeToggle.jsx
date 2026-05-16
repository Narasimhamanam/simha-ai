import { Sun, Moon } from "lucide-react";

function ThemeToggle({ theme, setTheme }) {
  const dark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label="Toggle theme"
      className={`p-2 rounded-xl transition-all touch-manipulation ${
        dark
          ? "text-gray-400 hover:text-yellow-400 hover:bg-white/8"
          : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
      }`}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export default ThemeToggle;
