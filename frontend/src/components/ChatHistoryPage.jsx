import { useState } from "react";
import { History, MessageSquare, Search, ArrowRight, Clock, Plus } from "lucide-react";

export default function ChatHistoryPage({
  theme,
  chats,
  setActiveChatId,
  setCurrentPage,
}) {
  const dark = theme === "dark";
  const [search, setSearch] = useState("");

  const filtered = chats.filter((c) =>
    (c.title || "New Chat").toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (chatId) => {
    setActiveChatId(chatId);
    setCurrentPage("chat");
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f8fafc] dark:bg-[#09090b]">
      
      {/* ── HEADER ── */}
      <div className="px-6 py-6 border-b border-slate-200/80 dark:border-white/[0.07] shrink-0 bg-white/50 dark:bg-[#0c0c0e]/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <History size={20} className="text-amber-500" />
              Conversation History
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Browse and resume past AI problem-solving sessions and agent dialogues
            </p>
          </div>

          <button
            onClick={() => setCurrentPage("chat")}
            className="btn-primary flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="max-w-4xl mx-auto mt-4">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06]">
            <Search size={14} className="text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations by title..."
              className="flex-1 bg-transparent text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs">
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── CONVERSATION LIST ── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-2.5">
          {filtered.length === 0 ? (
            <div className="py-16 text-center rounded-3xl bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-white/[0.06] p-8">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4 text-amber-500">
                <MessageSquare size={22} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                {search ? "No conversations match your search" : "No conversation history"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
                {search
                  ? "Try searching for a different phrase or start a new workspace."
                  : "All your future conversations and multi-agent workflows will be archived here automatically."}
              </p>
              {!search && (
                <button
                  onClick={() => setCurrentPage("chat")}
                  className="btn-primary mt-5"
                >
                  Start Your First Chat
                </button>
              )}
            </div>
          ) : (
            filtered.map((chat) => {
              const msgCount = (chat.messages || []).length;
              return (
                <div
                  key={chat.id}
                  onClick={() => handleSelect(chat.id)}
                  className="group flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-white/[0.06] hover:border-amber-500/40 dark:hover:border-amber-500/30 hover:shadow-sm cursor-pointer transition-all duration-150"
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-4">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200/60 dark:border-white/[0.06] flex items-center justify-center text-slate-600 dark:text-zinc-400 group-hover:text-amber-500 transition shrink-0">
                      <MessageSquare size={16} />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition truncate">
                        {chat.title || "Untitled Conversation"}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 dark:text-zinc-500">
                        <span>{msgCount} message{msgCount !== 1 ? "s" : ""}</span>
                        <span>•</span>
                        <span className="font-mono">Chat ID: {chat.id?.substring(0, 8)}...</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-700 dark:group-hover:text-zinc-200 flex items-center gap-1 transition">
                      Resume <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
