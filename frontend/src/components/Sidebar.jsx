import {
  MessageSquare, History, FileText, Settings, Plus, Trash2,
  X, Mail, Globe, CalendarDays, LogOut, ChevronRight, Zap,
  Sparkles, Code2, BookOpen, Crown, Shield, CreditCard
} from "lucide-react";
import { useState } from "react";
import API from "../services/api";

const NAV_ITEMS = [
  { id: "chat", icon: MessageSquare, label: "Astra Chat" },
  { id: "documents", icon: FileText, label: "Astra Docs" },
  { id: "email", icon: Mail, label: "Email Composer" },
  { id: "calendar", icon: CalendarDays, label: "AI Scheduler" },
  { id: "url", icon: Globe, label: "URL Research" },
  { id: "pricing", icon: Zap, label: "Astra Pass (₹99)" },
  { id: "history", icon: History, label: "Chat History" },
  { id: "settings", icon: Settings, label: "Settings" },
];

export default function Sidebar({
  theme,
  chats,
  setChats,
  activeChatId,
  setActiveChatId,
  createNewChat,
  currentPage,
  setCurrentPage,
  profile,
  handleLogout,
  isSidebarOpen,
  setIsSidebarOpen,
  isPro,
  daysRemaining,
  selectedAgent,
  setSelectedAgent,
}) {
  const [hovered, setHovered] = useState(false);
  const expanded = isSidebarOpen || hovered;

  const deleteChat = async (chatId) => {
    try {
      await API.delete(`/delete-chat/${chatId}`);
      const updated = chats.filter((c) => c.id !== chatId);
      setChats(updated);
      if (updated.length > 0) setActiveChatId(updated[0].id);
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  const navTo = (id) => {
    setCurrentPage(id);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const selectChat = (id) => {
    setActiveChatId(id);
    setCurrentPage("chat");
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${
          isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Rail / Drawer */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`
          fixed top-0 left-0 h-[100dvh] z-50 flex flex-col shrink-0
          transition-all duration-300 ease-out
          ${expanded ? "w-[260px]" : "w-[64px]"}
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          bg-[#0B0F17]/95 backdrop-blur-2xl
          border-r border-[var(--edge-subtle)]
        `}
        style={{ willChange: "width" }}
      >
        {/* Brand Header */}
        <div
          className={`flex items-center h-14 border-b border-[var(--edge-subtle)] shrink-0 ${
            expanded ? "px-4 gap-3" : "justify-center px-0"
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--astra-cyan)] to-[var(--royal-violet)] flex items-center justify-center shrink-0 shadow-md shadow-[var(--astra-glow)]">
            <Sparkles size={16} className="text-[#0B0F17]" />
          </div>

          {expanded && (
            <div className="flex flex-col min-w-0 animate-fade-in">
              <span className="text-sm font-black text-[var(--ink-1)] tracking-tight truncate">
                Astra <span className="text-[var(--astra-cyan)]">AI</span>
              </span>
              <span className="text-[9px] text-[var(--ink-3)] font-semibold uppercase tracking-wider">
                GPT 6 Astra
              </span>
            </div>
          )}

          {expanded && (
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden ml-auto p-1 rounded text-[var(--ink-3)] hover:text-[var(--ink-1)]"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* New Workspace / Chat Button */}
        <div className={`${expanded ? "p-3" : "p-2"}`}>
          <button
            onClick={() => {
              createNewChat();
              if (window.innerWidth < 1024) setIsSidebarOpen(false);
            }}
            className={`btn-astra w-full flex items-center justify-center gap-2 ${
              expanded ? "" : "!px-0"
            }`}
          >
            <Plus size={15} strokeWidth={2.5} />
            {expanded && <span>New Workspace</span>}
          </button>
        </div>

        {/* Navigation & Recent Conversations */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-2 py-1 space-y-4">
          
          {/* Main Navigation Items */}
          <nav className="space-y-0.5">
            {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
              const active = currentPage === id;
              return (
                <button
                  key={id}
                  onClick={() => navTo(id)}
                  title={!expanded ? label : undefined}
                  className={`w-full flex items-center rounded-xl transition-all duration-150 ${
                    expanded ? "px-3 py-2 gap-2.5" : "px-0 py-2 justify-center"
                  } text-xs font-medium ${
                    active
                      ? "glass-panel !rounded-xl text-[var(--ink-1)] font-bold border-[var(--edge)] bg-[var(--astra-glow)]"
                      : "text-[var(--ink-3)] hover:text-[var(--ink-1)] hover:bg-white/5"
                  }`}
                >
                  <Icon
                    size={16}
                    className={active ? "text-[var(--astra-cyan)]" : ""}
                    strokeWidth={active ? 2.2 : 1.7}
                  />
                  {expanded && <span className="truncate">{label}</span>}
                  {active && expanded && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--astra-cyan)] ml-auto" />
                  )}
                </button>
              );
            })}

            {/* Admin link (visible if admin) */}
            {profile?.is_admin && (
              <button
                onClick={() => navTo("admin")}
                title={!expanded ? "Admin Console" : undefined}
                className={`w-full flex items-center rounded-xl transition-all duration-150 ${
                  expanded ? "px-3 py-2 gap-2.5" : "px-0 py-2 justify-center"
                } text-xs font-medium ${
                  currentPage === "admin"
                    ? "glass-panel !rounded-xl text-[var(--ink-1)] font-bold border-[var(--edge)] bg-[var(--astra-glow)]"
                    : "text-amber-400/70 hover:text-amber-300 hover:bg-white/5"
                }`}
              >
                <Shield size={16} strokeWidth={1.7} />
                {expanded && <span className="truncate">Admin Console</span>}
              </button>
            )}
          </nav>

          {/* Recent Chat Workspaces */}
          {expanded && (
            <div className="animate-fade-in pt-2">
              <div className="flex items-center justify-between px-3 mb-1">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--ink-3)]">
                  Workspaces
                </span>
                <span className="text-[10px] font-mono text-[var(--ink-3)]">{chats.length}</span>
              </div>
              <div className="space-y-0.5">
                {chats.length === 0 ? (
                  <p className="px-3 py-3 text-center text-xs text-[var(--ink-3)]">No workspaces yet</p>
                ) : (
                  chats.map((chat) => {
                    const active = currentPage === "chat" && activeChatId === chat.id;
                    return (
                      <div
                        key={chat.id}
                        onClick={() => selectChat(chat.id)}
                        className={`group flex items-center gap-2 px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                          active
                            ? "glass-panel !rounded-xl text-[var(--ink-1)] font-medium border-[var(--edge)]"
                            : "text-[var(--ink-3)] hover:text-[var(--ink-2)] hover:bg-white/5"
                        }`}
                      >
                        <MessageSquare
                          size={13}
                          className={`shrink-0 ${active ? "text-[var(--astra-cyan)]" : "opacity-40"}`}
                        />
                        <span className="truncate flex-1">{chat.title || "Untitled Workspace"}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteChat(chat.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[var(--ink-3)] hover:text-red-400 transition"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pass Upgrade / Status Box */}
        <div className={`border-t border-[var(--edge-subtle)] shrink-0 ${expanded ? "p-3" : "p-2"}`}>
          {expanded && !isPro && (
            <button
              onClick={() => navTo("pricing")}
              className="w-full mb-2.5 flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold bg-[var(--astra-glow)] border border-[var(--edge)] text-[var(--astra-cyan)] hover:bg-[rgba(0,240,255,0.25)] transition shadow-sm"
            >
              <span className="flex items-center gap-1.5">
                <Zap size={13} /> Get Astra Pass — ₹99
              </span>
              <ChevronRight size={13} />
            </button>
          )}

          {expanded && isPro && (
            <div className="w-full mb-2.5 flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
              <span className="flex items-center gap-1.5">
                <Crown size={13} /> Astra Pass Active
              </span>
              <span className="text-[10px] font-mono">{daysRemaining || 7}d left</span>
            </div>
          )}

          {/* User Profile Capsule */}
          <div
            className={`flex items-center glass-panel !rounded-xl ${
              expanded ? "p-2 gap-2.5" : "p-1.5 justify-center"
            }`}
          >
            {profile?.avatar ? (
              <img
                src={profile.avatar}
                alt=""
                className="w-7 h-7 rounded-lg object-cover shrink-0 ring-1 ring-white/10"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-[var(--astra-glow)] border border-[var(--edge)] flex items-center justify-center shrink-0 text-xs font-bold text-[var(--astra-cyan)]">
                {profile?.nickname?.charAt(0)?.toUpperCase() || "A"}
              </div>
            )}

            {expanded && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold truncate text-[var(--ink-1)]">
                    {profile?.nickname?.split(" ")[0] || "Astra User"}
                  </span>
                  {isPro && (
                    <span className="text-[9px] px-1 rounded font-bold bg-[var(--astra-glow)] text-[var(--astra-cyan)]">
                      PASS
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-[var(--ink-3)] truncate block">
                  {profile?.email || ""}
                </span>
              </div>
            )}

            {expanded && (
              <button
                onClick={handleLogout}
                className="p-1 rounded text-[var(--ink-3)] hover:text-red-400 transition"
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
