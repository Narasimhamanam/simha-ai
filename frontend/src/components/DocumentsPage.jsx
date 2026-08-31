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
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) + " · " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function getFileIcon(fileName) {
  const ext = fileName?.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return { Icon: FileText, color: "var(--error)", bg: "rgba(239,68,68,0.1)" };
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return { Icon: FileImage, color: "var(--divine-cyan)", bg: "rgba(34,211,238,0.1)" };
  if (["txt", "md"].includes(ext)) return { Icon: FileText, color: "var(--success)", bg: "rgba(34,197,94,0.1)" };
  return { Icon: File, color: "var(--ink-3)", bg: "rgba(255,255,255,0.04)" };
}

export default function DocumentsPage({ theme, user, setActiveChatId, setCurrentPage }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const fetchDocs = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true); setError("");
    try { const res = await API.get(`/get-documents/${encodeURIComponent(user.email)}`); setDocs(res.data || []); }
    catch { setError("Could not load documents."); }
    finally { setLoading(false); }
  }, [user?.email]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleDelete = async (docId) => {
    setDeletingId(docId);
    try { await API.delete(`/delete-document/${docId}`); setDocs(p => p.filter(d => d.id !== docId)); }
    catch { setError("Failed to delete document."); }
    finally { setDeletingId(null); }
  };

  const goToChat = (chatId) => { if (!chatId) return; setActiveChatId(chatId); setCurrentPage("chat"); };
  const filtered = docs.filter(d => d.file_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: "var(--void)", color: "var(--ink-1)" }}>
      
      {/* Header */}
      <div className="px-6 py-6 border-b border-[var(--edge-subtle)] shrink-0" style={{ background: "var(--glass)" }}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Database size={20} style={{ color: "var(--mane-gold)" }} /> Knowledge Base
            </h1>
            <p className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>
              Indexed vectors for RAG across your workspaces
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchDocs} className="btn-ghost flex items-center gap-1.5" title="Refresh">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /><span>Refresh</span>
            </button>
            <button onClick={() => setCurrentPage("chat")} className="btn-gold flex items-center gap-1.5">
              <Plus size={14} strokeWidth={2.5} /><span>New Upload</span>
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto mt-4">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[var(--edge-subtle)]" style={{ background: "rgba(255,255,255,0.03)" }}>
            <Search size={14} style={{ color: "var(--ink-3)" }} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search files..."
              className="flex-1 bg-transparent text-xs outline-none" style={{ color: "var(--ink-1)" }} />
            {search && <button onClick={() => setSearch("")} className="text-xs" style={{ color: "var(--ink-3)" }}>Clear</button>}
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-4xl mx-auto w-full px-6 pt-4">
          <div className="flex items-center gap-2 p-3 rounded-xl text-xs bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-red-400">
            <AlertCircle size={14} /><span>{error}</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center glass-panel p-8">
              <div className="w-14 h-14 rounded-2xl bg-[var(--mane-gold-glow)] border border-[rgba(214,168,79,0.2)] flex items-center justify-center mx-auto mb-4" style={{ color: "var(--mane-gold)" }}>
                <Upload size={22} />
              </div>
              <h3 className="text-sm font-bold">{search ? "No matching documents" : "No documents indexed"}</h3>
              <p className="text-xs mt-1 max-w-sm mx-auto leading-relaxed" style={{ color: "var(--ink-3)" }}>
                {search ? "Try a different keyword." : "Attach a PDF or text file in any chat. It will be vectorized here."}
              </p>
              {!search && <button onClick={() => setCurrentPage("chat")} className="btn-gold mt-5">Start a Chat & Upload</button>}
            </div>
          ) : (
            filtered.map(doc => {
              const { Icon, color, bg } = getFileIcon(doc.file_name);
              return (
                <div key={doc.id} className="group flex items-center justify-between p-4 rounded-2xl float-card !rounded-2xl">
                  <div className="flex items-center gap-3.5 min-w-0 pr-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-[var(--edge-subtle)]" style={{ background: bg }}>
                      <Icon size={18} style={{ color }} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold truncate">{doc.file_name}</span>
                      <div className="flex items-center gap-3 mt-1 text-[10px]" style={{ color: "var(--ink-3)" }}>
                        <span className="flex items-center gap-1 font-mono"><HardDrive size={11} />{formatBytes(doc.file_size)}</span>
                        {doc.pages > 0 && <span className="flex items-center gap-1"><Layers size={11} />{doc.pages} vectors</span>}
                        <span className="flex items-center gap-1"><Clock size={11} />{formatDate(doc.uploaded_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {doc.chat_id && (
                      <button onClick={() => goToChat(doc.chat_id)} className="btn-ghost flex items-center gap-1 text-[11px] opacity-80 group-hover:opacity-100">
                        <span>Open Chat</span><ExternalLink size={11} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(doc.id)} disabled={deletingId === doc.id}
                      className="p-2 rounded-xl transition hover:bg-[rgba(255,255,255,0.04)]" style={{ color: "var(--ink-3)" }} title="Remove">
                      {deletingId === doc.id ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
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
