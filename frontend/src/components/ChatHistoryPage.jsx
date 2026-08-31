import { useState } from "react";
import { History, MessageSquare, Search, ArrowRight, Clock, Plus } from "lucide-react";

export default function ChatHistoryPage({ theme, chats, setActiveChatId, setCurrentPage }) {
  const [search, setSearch] = useState("");

  const filtered = chats.filter(c =>
    c.title?.toLowerCase().includes(search.toLowerCase())
  );

  const openChat = (chatId) => {
    setActiveChatId(chatId);
    setCurrentPage("chat");
  };

  const formatDate = (chat) => {
    const ts = chat.messages?.[chat.messages.length - 1]?.timestamp || chat.created_at;
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", { day: "2-digit", month: "short" }) +
      " · " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: "var(--void)", color: "var(--ink-1)" }}>
      
      {/* Header */}
      <div className="px-6 py-6 border-b border-[var(--edge-subtle)] shrink-0" style={{ background: "var(--glass)" }}>
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <History size={20} style={{ color: "var(--mane-gold)" }} /> Conversation Archive
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>
            Browse and resume past AI sessions
          </p>

          <div className="mt-4 flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[var(--edge-subtle)]" style={{ background: "rgba(255,255,255,0.03)" }}>
            <Search size={14} style={{ color: "var(--ink-3)" }} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations..."
              className="flex-1 bg-transparent text-xs outline-none" style={{ color: "var(--ink-1)" }} />
            {search && <button onClick={() => setSearch("")} className="text-xs" style={{ color: "var(--ink-3)" }}>Clear</button>}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-2">
          {filtered.length === 0 ? (
            <div className="py-16 text-center glass-panel p-8">
              <div className="w-14 h-14 rounded-2xl bg-[var(--mane-gold-glow)] border border-[rgba(214,168,79,0.2)] flex items-center justify-center mx-auto mb-4" style={{ color: "var(--mane-gold)" }}>
                <MessageSquare size={22} />
              </div>
              <h3 className="text-sm font-bold">{search ? "No matching conversations" : "No conversations yet"}</h3>
              <p className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>
                {search ? "Try a different search term." : "Start a new workspace to begin."}
              </p>
              {!search && (
                <button onClick={() => setCurrentPage("chat")} className="btn-gold mt-5 flex items-center gap-2 mx-auto">
                  <Plus size={14} /><span>New Workspace</span>
                </button>
              )}
            </div>
          ) : (
            filtered.map((chat) => {
              const msgCount = chat.messages?.length || 0;
              const lastMsg = chat.messages?.[chat.messages.length - 1];
              const preview = lastMsg?.content?.substring(0, 100) || "Empty conversation";

              return (
                <button
                  key={chat.id}
                  onClick={() => openChat(chat.id)}
                  className="w-full text-left float-card !rounded-2xl p-4 group flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-[var(--edge-subtle)]" style={{ background: "var(--mane-gold-glow)" }}>
                    <MessageSquare size={16} style={{ color: "var(--mane-gold)" }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold truncate pr-3">{chat.title || "Untitled"}</span>
                      <span className="text-[10px] font-mono shrink-0 flex items-center gap-1" style={{ color: "var(--ink-3)" }}>
                        <Clock size={10} />{formatDate(chat)}
                      </span>
                    </div>
                    <p className="text-[11px] truncate leading-relaxed" style={{ color: "var(--ink-3)" }}>{preview}</p>
                    <span className="text-[10px] font-mono mt-1 inline-block px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "var(--ink-3)" }}>
                      {msgCount} messages
                    </span>
                  </div>

                  <ArrowRight size={14} style={{ color: "var(--ink-3)" }} className="opacity-0 group-hover:opacity-100 transition shrink-0" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
