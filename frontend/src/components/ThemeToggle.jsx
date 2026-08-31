import { Sun, Moon } from "lucide-react";

function ThemeToggle({ theme, setTheme }) {
  const dark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label="Toggle theme"
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="p-1.5 rounded-lg transition duration-150 active:scale-95"
      style={{ color: "var(--ink-3)" }}
    >
      {dark ? (
        <Sun size={16} style={{ color: "var(--mane-gold)" }} />
      ) : (
        <Moon size={16} />
      )}
    </button>
  );
}

export default ThemeToggle;
