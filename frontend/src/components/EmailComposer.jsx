import { useState, useRef } from "react";
import {
  Mail, Send, X, Paperclip, Sparkles, Loader2,
  CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
  RefreshCw, Lock, Copy, Check, ArrowRight
} from "lucide-react";
import { signInWithPopup } from "firebase/auth";
import { auth, gmailProvider } from "../firebase";
import API from "../services/api";

// ── Gmail API helpers ──────────────────────────────────────────
function encodeEmailToBase64(to, cc, subject, body, fromName, attachments = []) {
  const boundary = "simha_ai_boundary_" + Date.now();
  const hasAttachments = attachments.length > 0;

  const headers = [
    `From: ${fromName}`,
    `To: ${to}`,
    cc ? `Cc: ${cc}` : null,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    hasAttachments
      ? `Content-Type: multipart/mixed; boundary="${boundary}"`
      : `Content-Type: text/plain; charset="UTF-8"`,
  ]
    .filter(Boolean)
    .join("\r\n");

  let raw;

  if (hasAttachments) {
    raw =
      headers +
      "\r\n\r\n" +
      `--${boundary}\r\n` +
      `Content-Type: text/plain; charset="UTF-8"\r\n\r\n` +
      body +
      "\r\n";

    for (const att of attachments) {
      raw +=
        `--${boundary}\r\n` +
        `Content-Type: ${att.type || "application/octet-stream"}; name="${att.name}"\r\n` +
        `Content-Disposition: attachment; filename="${att.name}"\r\n` +
        `Content-Transfer-Encoding: base64\r\n\r\n` +
        att.data +
        "\r\n";
    }
    raw += `--${boundary}--`;
  } else {
    raw = headers + "\r\n\r\n" + body;
  }

  return btoa(unescape(encodeURIComponent(raw)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const STEP = {
  PROMPT: "prompt",
  DRAFT: "draft",
  PERMISSION: "permission",
  SENDING: "sending",
  SUCCESS: "success",
  ERROR: "error",
};

const SUGGESTED_PROMPTS = [
  "Request a meeting with the engineering team to discuss quarterly deliverables",
  "Follow up on a submitted job application with updated portfolio",
  "Decline a sales vendor inquiry politely with professional tone",
  "Send a project status report with major highlights and pending blockers",
];

export default function EmailComposer({ theme, profile, onClose, credits, fetchCredits, isPro }) {
  const dark = theme === "dark";
  const outOfCredits = !isPro && credits !== undefined && credits <= 0;

  const [step, setStep] = useState(STEP.PROMPT);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState({ to: "", cc: "", subject: "", body: "", tone: "formal", suggestions: "" });
  const [attachments, setAttachments] = useState([]);
  const [accessToken, setAccessToken] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setErrorMsg("");
    try {
      const res = await API.post("/generate-email-draft", {
        prompt: prompt.trim(),
        sender_name: profile?.nickname || "",
        user_email: profile?.email || "",
      });
      setDraft(res.data);
      setStep(STEP.DRAFT);
    } catch {
      setErrorMsg("AI couldn't draft your email. Please refine your prompt.");
      setStep(STEP.ERROR);
    } finally {
      setGenerating(false);
      if (fetchCredits) fetchCredits();
    }
  };

  const handleFileAttach = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} exceeds 5MB attachment limit.`);
        continue;
      }
      const base64Data = await fileToBase64(file);
      setAttachments((prev) => [
        ...prev,
        { name: file.name, type: file.type, size: file.size, data: base64Data },
      ]);
    }
  };

  const handleSendEmail = async (token) => {
    const activeToken = token || accessToken;
    if (!activeToken) {
      setStep(STEP.PERMISSION);
      return;
    }
    if (!draft.to.trim()) {
      alert("Please enter a recipient email address.");
      return;
    }
    if (!draft.subject.trim()) {
      alert("Please enter an email subject line.");
      return;
    }

    setStep(STEP.SENDING);
    try {
      const fromName = profile?.nickname
        ? `${profile.nickname} <${profile.email}>`
        : profile?.email || "";

      const raw = encodeEmailToBase64(
        draft.to.trim(),
        draft.cc.trim(),
        draft.subject.trim(),
        draft.body.trim(),
        fromName,
        attachments
      );

      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || "Gmail API error.");
      }

      setStep(STEP.SUCCESS);
    } catch (err) {
      console.error("Gmail send error:", err);
      setErrorMsg(err.message || "Failed to send email via Gmail.");
      setStep(STEP.ERROR);
    }
  };

  const handleRequestPermission = async () => {
    try {
      const result = await signInWithPopup(auth, gmailProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) {
        setAccessToken(token);
        handleSendEmail(token);
      } else {
        throw new Error("Could not retrieve access token.");
      }
    } catch (err) {
      console.error("OAuth error:", err);
      setErrorMsg("Google Permission was not granted. Please retry.");
      setStep(STEP.ERROR);
    }
  };

  const copyDraft = async () => {
    const text = `To: ${draft.to}\nSubject: ${draft.subject}\n\n${draft.body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-2xl max-h-[100dvh] sm:max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-white/[0.08] shadow-2xl overflow-hidden">
        
        {/* ── MODAL HEADER ── */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-slate-200/80 dark:border-white/[0.07] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Mail size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                AI Email Composer
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                Draft, refine, and send via your connected Gmail
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* STEP 1: PROMPT INPUT */}
          {step === STEP.PROMPT && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Describe what you want to communicate:
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  placeholder={outOfCredits ? "Daily AI credits exhausted." : "e.g. Email John regarding tomorrow's 2 PM product review meeting with the updated slides..."}
                  disabled={outOfCredits || generating}
                  className="w-full rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.03] px-4 py-3 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none focus:border-amber-500/50 transition"
                />
              </div>

              {/* Suggestions */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block mb-2">
                  Sample Prompts
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUGGESTED_PROMPTS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(p)}
                      className="p-2.5 rounded-xl text-left text-xs bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.05] hover:border-amber-500/30 text-slate-600 dark:text-zinc-300 transition"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || generating || outOfCredits}
                  className="btn-primary flex items-center gap-2"
                >
                  {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>{generating ? "Generating Draft..." : "Generate Email Draft"}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: DRAFT REVIEW & EDIT */}
          {step === STEP.DRAFT && (
            <div className="space-y-4">
              
              {/* Recipient & CC */}
              <div className="grid grid-cols-1 gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-12 text-xs font-semibold text-slate-500 dark:text-zinc-400">To:</span>
                  <input
                    type="email"
                    value={draft.to}
                    onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                    placeholder="recipient@example.com"
                    className="flex-1 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.03] px-3.5 py-2 text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-amber-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCc(!showCc)}
                    className="text-xs text-amber-600 dark:text-amber-400 hover:underline px-1"
                  >
                    {showCc ? "Hide CC" : "Add CC"}
                  </button>
                </div>

                {showCc && (
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-xs font-semibold text-slate-500 dark:text-zinc-400">Cc:</span>
                    <input
                      type="text"
                      value={draft.cc}
                      onChange={(e) => setDraft({ ...draft, cc: e.target.value })}
                      placeholder="cc1@example.com, cc2@example.com"
                      className="flex-1 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.03] px-3.5 py-2 text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-amber-500/50"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="w-12 text-xs font-semibold text-slate-500 dark:text-zinc-400">Subject:</span>
                  <input
                    type="text"
                    value={draft.subject}
                    onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                    placeholder="Email subject..."
                    className="flex-1 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-zinc-100 outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Email Body:
                </label>
                <textarea
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  rows={8}
                  className="w-full rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-slate-900 dark:text-zinc-100 outline-none focus:border-amber-500/50 font-sans"
                />
              </div>

              {/* Attachments & Tone */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-100 dark:border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    hidden
                    multiple
                    onChange={handleFileAttach}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary flex items-center gap-1.5"
                  >
                    <Paperclip size={13} />
                    <span>Attach Files ({attachments.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={copyDraft}
                    className="btn-secondary flex items-center gap-1.5"
                  >
                    {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    <span>{copied ? "Copied" : "Copy Draft"}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStep(STEP.PROMPT)}
                    className="btn-secondary"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => handleSendEmail()}
                    className="btn-primary flex items-center gap-1.5"
                  >
                    <Send size={13} />
                    <span>Send via Gmail</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: GOOGLE OAUTH PERMISSION */}
          {step === STEP.PERMISSION && (
            <div className="py-8 text-center max-w-sm mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mx-auto text-amber-500">
                <Lock size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Connect Gmail to Send
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Authorize Simha AI to send this drafted email securely from your verified Google account.
                </p>
              </div>

              <button
                onClick={handleRequestPermission}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3"
              >
                <span>Authorize & Send</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* STEP 4: SENDING */}
          {step === STEP.SENDING && (
            <div className="py-12 text-center space-y-3">
              <Loader2 size={32} className="animate-spin text-amber-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                Sending your email via Gmail API...
              </p>
            </div>
          )}

          {/* STEP 5: SUCCESS */}
          {step === STEP.SUCCESS && (
            <div className="py-8 text-center max-w-sm mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto text-emerald-500">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Email Sent Successfully!
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Your message has been delivered to {draft.to}.
                </p>
              </div>

              <button
                onClick={onClose}
                className="btn-primary w-full"
              >
                Done
              </button>
            </div>
          )}

          {/* STEP 6: ERROR */}
          {step === STEP.ERROR && (
            <div className="py-8 text-center max-w-sm mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center mx-auto text-red-500">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Action Failed
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  {errorMsg || "An unexpected error occurred."}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(STEP.DRAFT)}
                  className="btn-secondary flex-1"
                >
                  Edit Draft
                </button>
                <button
                  onClick={onClose}
                  className="btn-primary flex-1"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
