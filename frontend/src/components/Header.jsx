import { Menu, SquarePen, Zap, Crown, BookOpen, Code2, Rocket, Sparkles } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const AGENTS = [
  { value: "study", label: "Astra Study", icon: BookOpen, color: "#2DD4BF" },
  { value: "coding", label: "Astra Code", icon: Code2, color: "#818CF8" },
  { value: "productivity", label: "Productivity", icon: Rocket, color: "#A78BFA" },
  { value: "wisdom", label: "Wisdom", icon: Sparkles, color: "#00F0FF" },
];

export default function Header({
  theme,
  setTheme,
  setIsSidebarOpen,
  isSidebarOpen,
  activeChat,
  currentPage,
  createNewChat,
  usage,
  isPro,
  daysRemaining,
  selectedAgent,
  setSelectedAgent,
}) {
  const chatTitle = activeChat?.title && activeChat.title !== "New Chat" ? activeChat.title : null;
  const messagesLeft = usage ? Math.max(0, usage.messages_limit - usage.messages_used) : 10;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 h-14 glass-header">
      
      {/* Left: Mobile Drawer Trigger & Workspace Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-1.5 rounded-lg text-[var(--ink-3)] hover:text-[var(--ink-1)] hover:bg-white/5 transition lg:hidden"
        >
          <Menu size={18} />
        </button>

        {currentPage === "chat" && chatTitle && (
          <span className="text-xs font-semibold text-[var(--ink-2)] max-w-[180px] truncate hidden sm:block">
            {chatTitle}
          </span>
        )}
      </div>

      {/* Center: Agent Orbit Rail */}
      <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-[var(--edge-subtle)]">
        {AGENTS.map(({ value, label, icon: Icon, color }) => {
          const isActive = selectedAgent === value;
          return (
            <button
              key={value}
              onClick={() => setSelectedAgent(value)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200 ${
                isActive
                  ? "text-[var(--ink-1)] glass-panel !rounded-full shadow-sm"
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

      {/* Right: Pass & Quota Status Pill, New Chat, Theme Toggle */}
      <div className="flex items-center gap-2">
        {/* Pass / Messages Quota */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-tight border ${
            isPro
              ? "text-[var(--astra-cyan)] bg-[var(--astra-glow)] border-[var(--edge)]"
              : messagesLeft <= 2
              ? "text-red-400 bg-red-500/10 border-red-500/20"
              : "text-[var(--ink-2)] bg-white/5 border-[var(--edge-subtle)]"
          }`}
        >
          {isPro ? <Crown size={12} /> : <Zap size={12} />}
          <span>{isPro ? `${daysRemaining || 7}d Pass` : `${messagesLeft} free left`}</span>
        </div>

        {currentPage === "chat" && (
          <button
            onClick={createNewChat}
            className="p-1.5 rounded-lg text-[var(--ink-3)] hover:text-[var(--ink-1)] hover:bg-white/5 transition"
            title="New workspace"
          >
            <SquarePen size={16} />
          </button>
        )}

        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>
    </header>
  );
}
