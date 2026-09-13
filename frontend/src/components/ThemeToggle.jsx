import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

/**
 * 3-state theme cycle: light → dark → system
 * Reads from and writes to ThemeContext (persisted in localStorage).
 */
function ThemeToggle() {
  const { preference, toggleTheme } = useTheme();

  const icon =
    preference === "light" ? (
      <Sun size={16} style={{ color: "var(--mane-gold)" }} />
    ) : preference === "system" ? (
      <Monitor size={16} />
    ) : (
      <Moon size={16} />
    );

  const label =
    preference === "light"
      ? "Switch to dark theme"
      : preference === "system"
      ? "Switch to light theme"
      : "Switch to system theme";

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title={label}
      className="p-1.5 rounded-lg transition duration-150 active:scale-95 hover:bg-white/5"
      style={{ color: "var(--ink-3)" }}
    >
      {icon}
    </button>
  );
}

export default ThemeToggle;

