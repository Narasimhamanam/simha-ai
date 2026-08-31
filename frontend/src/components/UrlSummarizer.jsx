import { useState } from "react";
import {
  Globe, X, Loader2, AlertCircle, Clock, Tag,
  ChevronRight, ExternalLink, Sparkles, List, BookOpen
} from "lucide-react";
import API from "../services/api";

export default function UrlSummarizer({ theme, onClose, credits, fetchCredits, userEmail, isPro }) {
  const outOfCredits = !isPro && credits !== undefined && credits <= 0;

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSummarize = async () => {
    if (!url.trim()) return;
    const cleanUrl = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;
    setLoading(true); setResult(null); setError("");
    try {
      const res = await API.post("/summarize-url", { url: cleanUrl, user_email: userEmail || "" });
      setResult(res.data);
    } catch (err) {
      setError(
        err?.response?.data?.detail?.includes("readable content")
          ? "This webpage does not contain enough extractable text."
          : "Unable to reach or parse this webpage."
      );
    } finally { setLoading(false); if (fetchCredits) fetchCredits(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" style={{ color: "var(--ink-1)" }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-2xl max-h-[100dvh] sm:max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden glass-panel">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-14 border-b border-[var(--edge-subtle)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--mane-gold-glow)] border border-[rgba(214,168,79,0.2)] flex items-center justify-center" style={{ color: "var(--mane-gold)" }}>
              <Globe size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold">Web Article Reader</h2>
              <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>Extract key insights from any link</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition" style={{ color: "var(--ink-3)" }}><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* URL Input */}
          <div className="flex gap-2">
            <input
              type="url" value={url} onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSummarize()}
              placeholder={outOfCredits ? "Credits exhausted." : "https://example.com/article"}
              disabled={outOfCredits || loading}
              className="flex-1 rounded-xl border border-[var(--edge-subtle)] bg-transparent px-3.5 py-2.5 text-xs outline-none focus:border-[var(--mane-gold)] transition"
              style={{ color: "var(--ink-1)" }}
            />
            <button onClick={handleSummarize} disabled={!url.trim() || loading || outOfCredits}
              className="btn-gold shrink-0 flex items-center gap-1.5 disabled:opacity-40">
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              <span>{loading ? "Reading..." : "Summarize"}</span>
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl text-xs bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-red-400">
              <AlertCircle size={14} className="shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}

          {loading && (
            <div className="space-y-3 p-4 rounded-2xl border border-[var(--edge-subtle)] animate-pulse" style={{ background: "var(--glass)" }}>
              <div className="h-5 w-2/3 rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="h-3 w-full rounded" style={{ background: "rgba(255,255,255,0.04)" }} />
              <div className="h-3 w-5/6 rounded" style={{ background: "rgba(255,255,255,0.04)" }} />
              <div className="h-3 w-4/6 rounded" style={{ background: "rgba(255,255,255,0.04)" }} />
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold border border-[var(--edge-subtle)]" style={{ background: "var(--mane-gold-glow)", color: "var(--mane-gold)" }}>
                    <Tag size={10} className="inline mr-1 -mt-0.5" />{result.category?.toUpperCase()}
                  </span>
                  {result.reading_time_minutes > 0 && (
                    <span className="text-[11px] flex items-center gap-1" style={{ color: "var(--ink-3)" }}>
                      <Clock size={11} />{result.reading_time_minutes} min read
                    </span>
                  )}
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-[11px] flex items-center gap-1 hover:underline ml-auto" style={{ color: "var(--mane-gold)" }}>
                    <span>Visit source</span><ExternalLink size={11} />
                  </a>
                </div>
                <h3 className="text-base font-bold leading-snug">{result.title}</h3>
              </div>

              <div className="p-4 rounded-2xl float-card !rounded-2xl">
                <h4 className="text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: "var(--ink-3)" }}>
                  <BookOpen size={12} /> Executive Summary
                </h4>
                <p className="text-xs leading-relaxed" style={{ color: "var(--ink-2)" }}>{result.summary}</p>
              </div>

              {result.key_points?.length > 0 && (
                <div className="p-4 rounded-2xl float-card !rounded-2xl">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest mb-2.5 flex items-center gap-1.5" style={{ color: "var(--ink-3)" }}>
                    <List size={12} /> Key Takeaways
                  </h4>
                  <ul className="space-y-2">
                    {result.key_points.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--ink-2)" }}>
                        <ChevronRight size={13} className="shrink-0 mt-0.5" style={{ color: "var(--mane-gold)" }} />
                        <span className="leading-relaxed">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button onClick={() => { setResult(null); setUrl(""); }} className="btn-ghost w-full">Summarize Another URL</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
