import { Sun, Moon } from "lucide-react";

function ThemeToggle({ theme, setTheme }) {
  const dark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label="Toggle theme"
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition duration-150 active:scale-95"
    >
      {dark ? (
        <Sun size={16} className="text-amber-400" />
      ) : (
        <Moon size={16} className="text-slate-600" />
      )}
    </button>
  );
}

export default ThemeToggle;
