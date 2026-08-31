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
      if (file.size > 5 * 1024 * 1024) { alert(`${file.name} exceeds 5MB attachment limit.`); continue; }
      const base64Data = await fileToBase64(file);
      setAttachments((prev) => [...prev, { name: file.name, type: file.type, size: file.size, data: base64Data }]);
    }
  };

  const handleSendEmail = async (token) => {
    const activeToken = token || accessToken;
    if (!activeToken) { setStep(STEP.PERMISSION); return; }
    if (!draft.to.trim()) { alert("Please enter a recipient email address."); return; }
    if (!draft.subject.trim()) { alert("Please enter an email subject line."); return; }

    setStep(STEP.SENDING);
    try {
      const fromName = profile?.nickname ? `${profile.nickname} <${profile.email}>` : profile?.email || "";
      const raw = encodeEmailToBase64(draft.to.trim(), draft.cc.trim(), draft.subject.trim(), draft.body.trim(), fromName, attachments);
      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${activeToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      });
      if (!res.ok) { const errData = await res.json(); throw new Error(errData.error?.message || "Gmail API error."); }
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
      if (token) { setAccessToken(token); handleSendEmail(token); }
      else throw new Error("Could not retrieve access token.");
    } catch (err) {
      console.error("OAuth error:", err);
      setErrorMsg("Google Permission was not granted. Please retry.");
      setStep(STEP.ERROR);
    }
  };

  const copyDraft = async () => {
    const text = `To: ${draft.to}\nSubject: ${draft.subject}\n\n${draft.body}`;
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  // ── Zero-G shared classes ──
  const inputCls = "w-full rounded-xl border border-[var(--edge-subtle)] bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-[var(--mane-gold)] transition";
  const labelCls = "block text-xs font-semibold mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" style={{ color: "var(--ink-1)" }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-2xl max-h-[100dvh] sm:max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden glass-panel">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-14 border-b border-[var(--edge-subtle)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--mane-gold-glow)] border border-[rgba(214,168,79,0.2)] flex items-center justify-center" style={{ color: "var(--mane-gold)" }}>
              <Mail size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold">AI Email Composer</h2>
              <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>Draft, refine, and send via Gmail</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition" style={{ color: "var(--ink-3)" }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {step === STEP.PROMPT && (
            <div className="space-y-4">
              <div>
                <label className={labelCls} style={{ color: "var(--ink-2)" }}>Describe what you want to communicate:</label>
                <textarea
                  value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4}
                  placeholder={outOfCredits ? "Daily AI credits exhausted." : "e.g. Email John regarding tomorrow's 2 PM product review meeting..."}
                  disabled={outOfCredits || generating}
                  className={`${inputCls} resize-none`} style={{ color: "var(--ink-1)" }}
                />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest block mb-2" style={{ color: "var(--ink-3)" }}>Sample Prompts</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUGGESTED_PROMPTS.map((p, i) => (
                    <button key={i} onClick={() => setPrompt(p)}
                      className="float-card !rounded-xl p-2.5 text-left text-xs" style={{ color: "var(--ink-2)" }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button onClick={handleGenerate} disabled={!prompt.trim() || generating || outOfCredits} className="btn-gold flex items-center gap-2 disabled:opacity-40">
                  {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>{generating ? "Generating Draft..." : "Generate Email Draft"}</span>
                </button>
              </div>
            </div>
          )}

          {step === STEP.DRAFT && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-12 text-xs font-semibold" style={{ color: "var(--ink-3)" }}>To:</span>
                  <input type="email" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                    placeholder="recipient@example.com" className={`flex-1 ${inputCls}`} style={{ color: "var(--ink-1)" }} />
                  <button onClick={() => setShowCc(!showCc)} className="text-xs px-1" style={{ color: "var(--mane-gold)" }}>
                    {showCc ? "Hide CC" : "Add CC"}
                  </button>
                </div>
                {showCc && (
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-xs font-semibold" style={{ color: "var(--ink-3)" }}>Cc:</span>
                    <input type="text" value={draft.cc} onChange={(e) => setDraft({ ...draft, cc: e.target.value })}
                      placeholder="cc1@example.com" className={`flex-1 ${inputCls}`} style={{ color: "var(--ink-1)" }} />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="w-12 text-xs font-semibold" style={{ color: "var(--ink-3)" }}>Subject:</span>
                  <input type="text" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                    placeholder="Email subject..." className={`flex-1 ${inputCls} font-medium`} style={{ color: "var(--ink-1)" }} />
                </div>
              </div>
              <div>
                <label className={labelCls} style={{ color: "var(--ink-2)" }}>Email Body:</label>
                <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={8}
                  className={`${inputCls} resize-none leading-relaxed`} style={{ color: "var(--ink-1)" }} />
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-[var(--edge-subtle)]">
                <div className="flex items-center gap-2">
                  <input type="file" ref={fileInputRef} hidden multiple onChange={handleFileAttach} />
                  <button onClick={() => fileInputRef.current?.click()} className="btn-ghost flex items-center gap-1.5">
                    <Paperclip size={13} /><span>Attach ({attachments.length})</span>
                  </button>
                  <button onClick={copyDraft} className="btn-ghost flex items-center gap-1.5">
                    {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copied ? "Copied" : "Copy Draft"}</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setStep(STEP.PROMPT)} className="btn-ghost">Back</button>
                  <button onClick={() => handleSendEmail()} className="btn-gold flex items-center gap-1.5">
                    <Send size={13} /><span>Send via Gmail</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === STEP.PERMISSION && (
            <div className="py-8 text-center max-w-sm mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--mane-gold-glow)] border border-[rgba(214,168,79,0.2)] flex items-center justify-center mx-auto" style={{ color: "var(--mane-gold)" }}>
                <Lock size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold">Connect Gmail to Send</h3>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--ink-3)" }}>
                  Authorize Simha AI to send this drafted email securely from your Google account.
                </p>
              </div>
              <button onClick={handleRequestPermission} className="btn-gold w-full flex items-center justify-center gap-2 py-3">
                <span>Authorize & Send</span><ArrowRight size={14} />
              </button>
            </div>
          )}

          {step === STEP.SENDING && (
            <div className="py-12 text-center space-y-3">
              <Loader2 size={32} className="animate-spin mx-auto" style={{ color: "var(--mane-gold)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--ink-2)" }}>Sending your email via Gmail API...</p>
            </div>
          )}

          {step === STEP.SUCCESS && (
            <div className="py-8 text-center max-w-sm mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold">Email Sent Successfully!</h3>
                <p className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>Your message has been delivered to {draft.to}.</p>
              </div>
              <button onClick={onClose} className="btn-gold w-full">Done</button>
            </div>
          )}

          {step === STEP.ERROR && (
            <div className="py-8 text-center max-w-sm mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] flex items-center justify-center mx-auto text-red-400">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold">Action Failed</h3>
                <p className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>{errorMsg || "An unexpected error occurred."}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(STEP.DRAFT)} className="btn-ghost flex-1">Edit Draft</button>
                <button onClick={onClose} className="btn-gold flex-1">Close</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
