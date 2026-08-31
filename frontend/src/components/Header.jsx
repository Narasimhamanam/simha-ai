import { Menu, SquarePen, Volume2, VolumeX, Zap, Crown, BookOpen, Code2, Rocket, Sparkles } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const AGENTS = [
  { value: "study",        label: "Study",        icon: BookOpen, color: "var(--mane-gold)" },
  { value: "coding",       label: "Coding",       icon: Code2,    color: "var(--royal-violet)" },
  { value: "productivity", label: "Productivity", icon: Rocket,   color: "var(--divine-cyan)" },
  { value: "divine",       label: "Krishna AI",   icon: Sparkles, color: "#38BDF8" },
];

function Header({
  theme, setTheme, setIsSidebarOpen, isSidebarOpen,
  activeChat, currentPage, createNewChat, credits, isPro,
  selectedAgent, setSelectedAgent, isMusicPlaying, setIsMusicPlaying,
}) {
  const isDivine = selectedAgent === "divine";
  const chatTitle = activeChat?.title && activeChat.title !== "New Chat" ? activeChat.title : null;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 h-12 glass-header">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-1.5 rounded-lg text-[var(--ink-3)] hover:text-[var(--ink-1)] hover:bg-[rgba(255,255,255,0.04)] transition lg:hidden"
        >
          <Menu size={17} />
        </button>

        {currentPage === "chat" && chatTitle && (
          <span className="text-xs font-semibold text-[var(--ink-2)] max-w-[180px] truncate hidden sm:block">
            {chatTitle}
          </span>
        )}
      </div>

      {/* Center: Orbit Rail — agent selector */}
      <div className="flex items-center gap-1">
        {AGENTS.map(({ value, label, icon: Icon, color }) => {
          const isActive = selectedAgent === value;
          return (
            <button
              key={value}
              onClick={() => setSelectedAgent(value)}
              className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200 ${
                isActive
                  ? "text-[var(--ink-1)] glass-panel !rounded-full"
                  : "text-[var(--ink-3)] hover:text-[var(--ink-2)]"
              }`}
              title={label}
            >
              <Icon size={13} style={isActive ? { color } : {}} />
              <span className="hidden sm:inline">{label}</span>
              {isActive && (
                <span
                  className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ background: color }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Credits */}
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold tracking-tight ${
          isPro
            ? "text-[var(--mane-gold)] bg-[var(--mane-gold-glow)]"
            : credits <= 0
            ? "text-red-400 bg-[rgba(239,68,68,0.1)]"
            : "text-[var(--ink-2)] bg-[rgba(255,255,255,0.04)]"
        }`}>
          {isPro ? <Crown size={11} /> : <Zap size={11} />}
          <span>{isPro ? "∞" : `${Number(credits || 0).toFixed(1)}`}</span>
        </div>

        {/* Flute toggle */}
        {isDivine && (
          <button
            onClick={() => setIsMusicPlaying(!isMusicPlaying)}
            className={`p-1.5 rounded-lg transition ${
              isMusicPlaying
                ? "text-[var(--divine-cyan)] bg-[var(--divine-cyan-glow)]"
                : "text-[var(--ink-3)] hover:text-[var(--ink-1)]"
            }`}
            title={isMusicPlaying ? "Pause flute" : "Play flute"}
          >
            {isMusicPlaying ? <Volume2 size={14} className="animate-pulse" /> : <VolumeX size={14} />}
          </button>
        )}

        {currentPage === "chat" && (
          <button onClick={createNewChat} className="p-1.5 rounded-lg text-[var(--ink-3)] hover:text-[var(--ink-1)] hover:bg-[rgba(255,255,255,0.04)] transition" title="New workspace">
            <SquarePen size={15} />
          </button>
        )}

        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>
    </header>
  );
}

export default Header;
