import { useState } from "react";
import {
  Globe, X, Loader2, AlertCircle, Clock, Tag,
  ChevronRight, ExternalLink, Sparkles, List
} from "lucide-react";
import API from "../services/api";

const CATEGORY_COLORS = {
  article: "bg-blue-500/20 text-blue-400",
  documentation: "bg-green-500/20 text-green-400",
  research: "bg-amber-500/20 text-amber-500",
  news: "bg-orange-500/20 text-orange-400",
  tutorial: "bg-cyan-500/20 text-cyan-400",
  other: "bg-gray-500/20 text-gray-400",
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
          ? "This page doesn't have enough readable text. Try a different URL."
          : "Couldn't fetch this URL. It may be behind a login or bot protection."
      );
    } finally {
      setLoading(false);
      if (fetchCredits) fetchCredits();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className={`relative w-full sm:max-w-2xl max-h-[100dvh] sm:max-h-[88vh] flex flex-col rounded-t-2xl sm:rounded-2xl border shadow-2xl overflow-hidden ${
        dark ? "bg-[#111111] border-gray-800" : "bg-white border-gray-200"
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${dark ? "border-gray-800" : "border-gray-100"}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center">
              <Globe size={15} className="text-white" />
            </div>
            <div>
              <h2 className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>Web URL Summarizer</h2>
              <p className={`text-[10px] ${dark ? "text-gray-500" : "text-gray-400"}`}>Paste any URL and AI reads it for you</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl transition ${dark ? "hover:bg-white/8 text-gray-500" : "hover:bg-gray-100 text-gray-400"}`}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* URL Input */}
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSummarize()}
              placeholder={outOfCredits ? "Daily limit reached." : "https://example.com/article"}
              disabled={outOfCredits}
              style={{ fontSize: "16px" }}
              className={`flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none transition ${
                dark
                  ? "bg-[#1a1a1a] border-gray-800 text-white placeholder:text-gray-600 focus:border-cyan-600"
                  : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-cyan-500"
              }`}
            />
            <button
              onClick={handleSummarize}
              disabled={!url.trim() || loading || outOfCredits}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-600 text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition disabled:opacity-50 touch-manipulation shrink-0"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {loading ? "Reading..." : "Summarize"}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl text-xs ${dark ? "bg-red-950/50 border border-red-900 text-red-400" : "bg-red-50 border border-red-100 text-red-600"}`}>
              <AlertCircle size={13} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Loading shimmer */}
          {loading && (
            <div className="space-y-3 animate-pulse">
              <div className={`h-5 w-3/4 rounded-lg ${dark ? "bg-gray-800" : "bg-gray-200"}`} />
              <div className={`h-3 w-full rounded ${dark ? "bg-gray-800" : "bg-gray-200"}`} />
              <div className={`h-3 w-5/6 rounded ${dark ? "bg-gray-800" : "bg-gray-200"}`} />
              <div className={`h-3 w-4/6 rounded ${dark ? "bg-gray-800" : "bg-gray-200"}`} />
            </div>
          )}

          {/* Result */}
          {result && !loading && (
            <div className="space-y-4">
              {/* Title + metadata */}
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${CATEGORY_COLORS[result.category] || CATEGORY_COLORS.other}`}>
                    <Tag size={9} className="inline mr-1" />
                    {result.category}
                  </span>
                  {result.reading_time_minutes > 0 && (
                    <span className={`text-[10px] flex items-center gap-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>
                      <Clock size={9} />
                      {result.reading_time_minutes} min read
                    </span>
                  )}
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-cyan-500 flex items-center gap-0.5 hover:underline ml-auto">
                    Open original <ExternalLink size={9} />
                  </a>
                </div>
                <h3 className={`text-base font-semibold leading-snug ${dark ? "text-white" : "text-gray-900"}`}>
                  {result.title}
                </h3>
              </div>

              {/* Summary */}
              <div className={`p-4 rounded-xl border ${dark ? "bg-[#1a1a1a] border-gray-800" : "bg-gray-50 border-gray-100"}`}>
                <p className={`text-[13px] leading-7 ${dark ? "text-gray-300" : "text-gray-700"}`}>
                  {result.summary}
                </p>
              </div>

              {/* Key points */}
              {result.key_points?.length > 0 && (
                <div>
                  <div className={`flex items-center gap-2 mb-2.5 text-[11px] font-semibold uppercase tracking-wide ${dark ? "text-gray-500" : "text-gray-400"}`}>
                    <List size={12} />
                    Key Points
                  </div>
                  <ul className="space-y-2">
                    {result.key_points.map((pt, i) => (
                      <li key={i} className={`flex items-start gap-2.5 text-[13px] ${dark ? "text-gray-300" : "text-gray-700"}`}>
                        <ChevronRight size={14} className="text-cyan-500 shrink-0 mt-0.5" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Try another */}
              <button
                onClick={() => { setResult(null); setUrl(""); }}
                className={`w-full py-2.5 rounded-xl text-sm border transition touch-manipulation ${
                  dark ? "border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700" : "border-gray-200 text-gray-500 hover:text-gray-700"
                }`}
              >
                Summarize another URL
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
