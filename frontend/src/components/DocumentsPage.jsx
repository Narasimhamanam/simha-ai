import { useState, useEffect, useCallback } from "react";
import {
  FileText, Trash2, RefreshCw, Search, Upload,
  FileImage, File, Clock, Layers, ExternalLink, AlertCircle,
  Database, Plus, HardDrive
} from "lucide-react";
import API from "../services/api";

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  );
}

function getFileIcon(fileName) {
  const ext = fileName?.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return { Icon: FileText, color: "text-red-500", bg: "bg-red-500/10 border-red-500/20" };
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext))
    return { Icon: FileImage, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" };
  if (["txt", "md"].includes(ext))
    return { Icon: FileText, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" };
  return { Icon: File, color: "text-slate-500", bg: "bg-slate-500/10 border-slate-500/20" };
}

export default function DocumentsPage({ theme, user, setActiveChatId, setCurrentPage }) {
  const dark = theme === "dark";

  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const fetchDocs = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    setError("");
    try {
      const res = await API.get(`/get-documents/${encodeURIComponent(user.email)}`);
      setDocs(res.data || []);
    } catch {
      setError("Could not load knowledge documents. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleDelete = async (docId) => {
    setDeletingId(docId);
    try {
      await API.delete(`/delete-document/${docId}`);
      setDocs((prev) => prev.filter((d) => d.id !== docId));
    } catch {
      setError("Failed to delete document.");
    } finally {
      setDeletingId(null);
    }
  };

  const goToChat = (chatId) => {
    if (!chatId) return;
    setActiveChatId(chatId);
    setCurrentPage("chat");
  };

  const filtered = docs.filter((d) =>
    d.file_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f8fafc] dark:bg-[#09090b]">
      
      {/* ── WORKSPACE HEADER ── */}
      <div className="px-6 py-6 border-b border-slate-200/80 dark:border-white/[0.07] shrink-0 bg-white/50 dark:bg-[#0c0c0e]/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Database size={20} className="text-amber-500" />
              Knowledge Base & Documents
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Indexed vectors available for Retrieval-Augmented Generation (RAG) across your chats
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDocs}
              className="btn-secondary flex items-center gap-1.5"
              title="Refresh repository"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setCurrentPage("chat")}
              className="btn-primary flex items-center gap-1.5"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>New Chat Upload</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-4xl mx-auto mt-4">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06]">
            <Search size={14} className="text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search indexed files by name..."
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

      {/* ── ERROR BANNER ── */}
      {error && (
        <div className="max-w-4xl mx-auto w-full px-6 pt-4">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* ── DOCUMENT LISTING ── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-3">
          
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 rounded-2xl bg-slate-200/50 dark:bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center rounded-3xl bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-white/[0.06] p-8">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4 text-amber-500">
                <Upload size={22} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                {search ? "No matching documents found" : "No documents indexed yet"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
                {search
                  ? "Try searching with a different keyword or clear the search filter."
                  : "Attach a PDF or text file in any chat session. It will be vectorized and displayed here for rapid recall."}
              </p>
              {!search && (
                <button
                  onClick={() => setCurrentPage("chat")}
                  className="btn-primary mt-5"
                >
                  Start a Chat & Upload
                </button>
              )}
            </div>
          ) : (
            filtered.map((doc) => {
              const { Icon, color, bg } = getFileIcon(doc.file_name);
              return (
                <div
                  key={doc.id}
                  className="group flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-white/[0.06] hover:border-amber-500/40 dark:hover:border-amber-500/30 hover:shadow-sm transition-all duration-150"
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${bg}`}>
                      <Icon size={18} className={color} />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate">
                        {doc.file_name}
                      </span>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 dark:text-zinc-500">
                        <span className="flex items-center gap-1 font-mono">
                          <HardDrive size={11} />
                          {formatBytes(doc.file_size)}
                        </span>
                        {doc.pages > 0 && (
                          <span className="flex items-center gap-1">
                            <Layers size={11} />
                            {doc.pages} vectors
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {formatDate(doc.uploaded_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {doc.chat_id && (
                      <button
                        onClick={() => goToChat(doc.chat_id)}
                        className="btn-secondary flex items-center gap-1 text-[11px] opacity-80 group-hover:opacity-100"
                        title="Resume chat where this document was added"
                      >
                        <span>Open Chat</span>
                        <ExternalLink size={11} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
                      title="Remove document from index"
                    >
                      {deletingId === doc.id ? (
                        <RefreshCw size={13} className="animate-spin" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
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
