import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext(null);

function resolveInitialTheme() {
  try {
    const stored = localStorage.getItem("astra-theme");
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {}
  return "system";
}

function applyTheme(preference) {
  const root = document.documentElement;
  let effective = preference;
  if (preference === "system") {
    effective = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  if (effective === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }
  return effective;
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(resolveInitialTheme);
  const [effective, setEffective] = useState(() => applyTheme(resolveInitialTheme()));

  useEffect(() => {
    const eff = applyTheme(preference);
    setEffective(eff);
    try { localStorage.setItem("astra-theme", preference); } catch {}
  }, [preference]);

  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => { const eff = applyTheme("system"); setEffective(eff); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [preference]);

  const value = {
    preference,
    theme: effective,
    setTheme: setPreference,
    toggleTheme: () => setPreference((p) => p === "dark" ? "light" : p === "light" ? "system" : "dark"),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}
