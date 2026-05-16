import { useState, useEffect, useCallback } from "react";
import {
  FileText, Trash2, RefreshCw, Search, Upload,
  FileImage, File, Clock, Layers, ExternalLink, AlertCircle
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
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function getFileIcon(fileName, fileType) {
  const ext = fileName?.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return { Icon: FileText, color: "text-red-400", bg: "bg-red-500/15" };
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return { Icon: FileImage, color: "text-blue-400", bg: "bg-blue-500/15" };
  if (["doc", "docx"].includes(ext)) return { Icon: FileText, color: "text-indigo-400", bg: "bg-indigo-500/15" };
  if (["txt", "md"].includes(ext)) return { Icon: FileText, color: "text-green-400", bg: "bg-green-500/15" };
  return { Icon: File, color: "text-gray-400", bg: "bg-gray-500/15" };
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
      setError("Could not load documents. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

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

  // ── LOADING ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={`px-6 py-5 border-b ${dark ? "border-gray-800" : "border-gray-100"}`}>
          <h2 className={`text-lg font-semibold ${dark ? "text-white" : "text-gray-900"}`}>My Documents</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <p className={`text-sm ${dark ? "text-gray-500" : "text-gray-400"}`}>Loading documents...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN RENDER ──────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className={`px-5 py-4 border-b shrink-0 ${dark ? "border-gray-800" : "border-gray-100"}`}>
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h2 className={`text-base font-semibold ${dark ? "text-white" : "text-gray-900"}`}>My Documents</h2>
            <p className={`text-[11px] mt-0.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>
              {docs.length} document{docs.length !== 1 ? "s" : ""} uploaded
            </p>
          </div>
          <button
            onClick={fetchDocs}
            title="Refresh"
            className={`p-2 rounded-xl transition touch-manipulation ${
              dark ? "hover:bg-white/8 text-gray-500 hover:text-gray-300" : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            }`}
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Search */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
          dark ? "bg-[#1a1a1a] border-gray-800" : "bg-gray-50 border-gray-200"
        }`}>
          <Search size={13} className={dark ? "text-gray-600" : "text-gray-400"} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            style={{ fontSize: "16px" }}
            className={`flex-1 bg-transparent text-sm outline-none ${
              dark ? "text-gray-300 placeholder:text-gray-600" : "text-gray-700 placeholder:text-gray-400"
            }`}
          />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className={`mx-5 mt-4 flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs ${
          dark ? "bg-red-950/50 border border-red-900 text-red-400" : "bg-red-50 border border-red-100 text-red-600"
        }`}>
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      {/* Document list */}
      <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
        {filtered.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              dark ? "bg-gray-800/60" : "bg-gray-100"
            }`}>
              <Upload size={28} className={dark ? "text-gray-600" : "text-gray-400"} />
            </div>
            <div className="text-center">
              <p className={`text-sm font-medium mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>
                {search ? "No documents match your search" : "No documents yet"}
              </p>
              <p className={`text-xs ${dark ? "text-gray-600" : "text-gray-400"}`}>
                {search ? "Try a different search term" : "Upload a PDF or document in any chat to see it here"}
              </p>
            </div>
          </div>
        )}

        {filtered.map((doc) => {
          const { Icon, color, bg } = getFileIcon(doc.file_name, doc.file_type);
          return (
            <div
              key={doc.id}
              className={`group flex items-center gap-3.5 p-3.5 rounded-xl border transition-all ${
                dark
                  ? "bg-[#141414] border-gray-800/60 hover:border-gray-700 hover:bg-[#1a1a1a]"
                  : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm"
              }`}
            >
              {/* File icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                <Icon size={18} className={color} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${dark ? "text-gray-200" : "text-gray-800"}`}>
                  {doc.file_name}
                </p>
                <div className={`flex items-center gap-3 mt-1 text-[11px] ${dark ? "text-gray-600" : "text-gray-400"}`}>
                  <span>{formatBytes(doc.file_size)}</span>
                  {doc.pages > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Layers size={9} />
                      {doc.pages} chunks
                    </span>
                  )}
                  <span className="flex items-center gap-0.5">
                    <Clock size={9} />
                    {formatDate(doc.uploaded_at)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {doc.chat_id && (
                  <button
                    onClick={() => goToChat(doc.chat_id)}
                    title="Go to chat where this was uploaded"
                    className={`p-2 rounded-lg transition opacity-0 group-hover:opacity-100 touch-manipulation ${
                      dark ? "hover:bg-white/8 text-gray-500 hover:text-cyan-400" : "hover:bg-gray-100 text-gray-400 hover:text-cyan-600"
                    }`}
                  >
                    <ExternalLink size={13} />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={deletingId === doc.id}
                  title="Delete document"
                  className={`p-2 rounded-lg transition opacity-0 group-hover:opacity-100 touch-manipulation ${
                    dark ? "hover:bg-red-500/15 text-gray-500 hover:text-red-400" : "hover:bg-red-50 text-gray-400 hover:text-red-500"
                  }`}
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
        })}
      </div>

      {/* Footer tip */}
      <div className={`px-5 py-3.5 border-t shrink-0 ${dark ? "border-gray-800" : "border-gray-100"}`}>
        <p className={`text-[11px] text-center ${dark ? "text-gray-700" : "text-gray-400"}`}>
          📎 Upload a PDF or .txt in any chat — it will appear here automatically
        </p>
      </div>
    </div>
  );
}
