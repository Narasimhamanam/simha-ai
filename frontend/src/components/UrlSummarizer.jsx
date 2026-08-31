import { useState } from "react";
import {
  Globe, X, Loader2, AlertCircle, Clock, Tag,
  ChevronRight, ExternalLink, Sparkles, List, ArrowRight, BookOpen
} from "lucide-react";
import API from "../services/api";

const CATEGORY_STYLES = {
  article: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  documentation: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  research: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  news: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  tutorial: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  other: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
};

export default function UrlSummarizer({ theme, onClose, credits, fetchCredits, userEmail, isPro }) {
  const dark = theme === "dark";
  const outOfCredits = !isPro && credits !== undefined && credits <= 0;

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSummarize = async () => {
    if (!url.trim()) return;
    const cleanUrl = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;

    setLoading(true);
    setResult(null);
    setError("");

    try {
      const res = await API.post("/summarize-url", { url: cleanUrl, user_email: userEmail || "" });
      setResult(res.data);
    } catch (err) {
      setError(
        err?.response?.data?.detail?.includes("readable content")
          ? "This webpage does not contain enough extractable text. Please try another URL."
          : "Unable to reach or parse this webpage. It may require authentication or captcha."
      );
    } finally {
      setLoading(false);
      if (fetchCredits) fetchCredits();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-2xl max-h-[100dvh] sm:max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-white/[0.08] shadow-2xl overflow-hidden">
        
        {/* ── MODAL HEADER ── */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-slate-200/80 dark:border-white/[0.07] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Globe size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Web Article Reader
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                Extract key insights, executive summary, and takeaways from any link
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── MODAL BODY ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* URL Input Bar */}
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSummarize()}
              placeholder={outOfCredits ? "Daily AI credits exhausted." : "https://example.com/research-article"}
              disabled={outOfCredits || loading}
              className="flex-1 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.03] px-3.5 py-2.5 text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none focus:border-amber-500/50 transition"
            />
            <button
              onClick={handleSummarize}
              disabled={!url.trim() || loading || outOfCredits}
              className="btn-primary shrink-0 flex items-center gap-1.5"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              <span>{loading ? "Reading..." : "Summarize"}</span>
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl text-xs bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && (
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04] animate-pulse">
              <div className="h-5 w-2/3 rounded-lg bg-slate-200 dark:bg-white/[0.08]" />
              <div className="h-3 w-full rounded bg-slate-200 dark:bg-white/[0.06]" />
              <div className="h-3 w-5/6 rounded bg-slate-200 dark:bg-white/[0.06]" />
              <div className="h-3 w-4/6 rounded bg-slate-200 dark:bg-white/[0.06]" />
            </div>
          )}

          {/* Result Card */}
          {result && !loading && (
            <div className="space-y-4 animate-fade-in">
              
              {/* Header Info */}
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border ${CATEGORY_STYLES[result.category] || CATEGORY_STYLES.other}`}>
                    <Tag size={10} className="inline mr-1 -mt-0.5" />
                    {result.category?.toUpperCase()}
                  </span>

                  {result.reading_time_minutes > 0 && (
                    <span className="text-[11px] flex items-center gap-1 text-slate-400 dark:text-zinc-500">
                      <Clock size={11} />
                      {result.reading_time_minutes} min original read
                    </span>
                  )}

                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:underline ml-auto"
                  >
                    <span>Visit source</span>
                    <ExternalLink size={11} />
                  </a>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                  {result.title}
                </h3>
              </div>

              {/* Summary Body */}
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06]">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2 flex items-center gap-1.5">
                  <BookOpen size={12} />
                  Executive Summary
                </h4>
                <p className="text-xs leading-relaxed text-slate-700 dark:text-zinc-300">
                  {result.summary}
                </p>
              </div>

              {/* Key Takeaways */}
              {result.key_points?.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06]">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2.5 flex items-center gap-1.5">
                    <List size={12} />
                    Core Key Takeaways
                  </h4>
                  <ul className="space-y-2">
                    {result.key_points.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-zinc-300">
                        <ChevronRight size={13} className="text-amber-500 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Reset action */}
              <button
                onClick={() => { setResult(null); setUrl(""); }}
                className="btn-secondary w-full"
              >
                Summarize Another URL
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
