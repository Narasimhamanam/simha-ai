import { useState, useRef } from "react";
import {
  Mail, Send, X, Paperclip, Sparkles, Loader2,
  CheckCircle2, AlertCircle, RefreshCw, Lock, Copy,
  Check, ArrowRight, Trash2, SlidersHorizontal
} from "lucide-react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
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
  "Write a professional email requesting project approval from executive leadership.",
  "Follow up on an interview with updated portfolio links and appreciation.",
  "Politely decline a vendor sales pitch while keeping doors open for the future.",
  "Quarterly sprint summary update highlighting key deliverables and next milestones.",
];

const TONE_OPTIONS = ["Professional", "Casual", "Urgent", "Friendly", "Direct"];

export default function EmailComposer({ theme, profile, onClose, credits, fetchCredits, isPro }) {
  const outOfCredits = !isPro && credits !== undefined && credits <= 0;

  const [step, setStep] = useState(STEP.PROMPT);
  const [prompt, setPrompt] = useState("");
  const [recipient, setRecipient] = useState("");
  const [context, setContext] = useState("");
  const [tone, setTone] = useState("Professional");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState({ to: "", cc: "", subject: "", body: "", tone: "Professional", suggestions: "" });
  const [attachments, setAttachments] = useState([]);
  const [accessToken, setAccessToken] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef(null);

  const handleGenerate = async (customPrompt) => {
    const activePrompt = (customPrompt || prompt).trim();
    if (!activePrompt) return;
    setGenerating(true);
    setErrorMsg("");
    try {
      const payload = {
        prompt: activePrompt,
        sender_name: profile?.nickname || profile?.displayName || "",
        user_email: profile?.email || "",
        recipient_name: recipient.trim(),
        recipient_email: recipient.includes("@") ? recipient.trim() : "",
        context: context.trim(),
        tone: tone,
        additional_instructions: additionalInstructions.trim(),
      };

      const res = await API.post("/generate-email", payload);
      setDraft(res.data);
      setStep(STEP.DRAFT);
    } catch (err) {
      console.error("Email generation error:", err);
      const detail = err.response?.data?.detail || err.message || "Email generation failed.";
      setErrorMsg(typeof detail === "string" ? detail : "AI couldn't draft your email. Please try again.");
      setStep(STEP.ERROR);
    } finally {
      setGenerating(false);
      if (fetchCredits) fetchCredits();
    }
  };

  const handleClear = () => {
    setPrompt("");
    setRecipient("");
    setContext("");
    setAdditionalInstructions("");
    setDraft({ to: "", cc: "", subject: "", body: "", tone: "Professional", suggestions: "" });
    setAttachments([]);
    setStep(STEP.PROMPT);
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
      const fromName = profile?.nickname || profile?.displayName ? `${profile.nickname || profile.displayName} <${profile.email}>` : profile?.email || "";
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
    const text = `To: ${draft.to}\n${draft.cc ? `Cc: ${draft.cc}\n` : ""}Subject: ${draft.subject}\n\n${draft.body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  // ── Shared styling classes ──
  const inputCls = "w-full rounded-xl border border-[var(--edge-subtle)] bg-[var(--surface-1)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--mane-gold)] transition text-[var(--ink-1)] placeholder-[var(--ink-3)]";
  const labelCls = "block text-xs font-semibold mb-1.5 text-[var(--ink-2)]";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in text-[var(--ink-1)]">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full sm:max-w-2xl max-h-[100dvh] sm:max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden glass-panel border border-[var(--edge-subtle)] shadow-2xl bg-[var(--canvas-bg)]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-14 border-b border-[var(--edge-subtle)] shrink-0 bg-[var(--surface-1)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--mane-gold-glow)] border border-[rgba(214,168,79,0.3)] flex items-center justify-center text-[var(--mane-gold)]">
              <Mail size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--ink-1)]">Simha AI Email Composer</h2>
              <p className="text-[11px] text-[var(--ink-3)]">Intelligent drafting, custom tone, & direct Gmail delivery</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              className="p-1.5 rounded-lg text-[var(--ink-3)] hover:text-red-400 hover:bg-white/5 transition"
              title="Clear composer"
            >
              <Trash2 size={15} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--ink-3)] hover:text-[var(--ink-1)] hover:bg-white/5 transition"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">

          {/* STEP 1: PROMPT & CONTROLS */}
          {step === STEP.PROMPT && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>What would you like to communicate?</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  placeholder={outOfCredits ? "Daily AI credits exhausted." : "e.g. Write a professional email requesting project approval from executive leadership..."}
                  disabled={outOfCredits || generating}
                  className={`${inputCls} resize-none`}
                />
              </div>

              {/* Tone Selection */}
              <div>
                <label className={labelCls}>Tone of Voice:</label>
                <div className="flex flex-wrap gap-2">
                  {TONE_OPTIONS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTone(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        tone === t
                          ? "bg-[var(--mane-gold-glow)] border-[var(--mane-gold)] text-[var(--mane-gold)] font-bold shadow-sm"
                          : "border-[var(--edge-subtle)] text-[var(--ink-2)] hover:border-[var(--edge-hover)] bg-[var(--surface-1)]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient & Additional instructions grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Recipient / Context (Optional):</label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="e.g. Hiring Manager / John Doe"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Additional Instructions (Optional):</label>
                  <input
                    type="text"
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    placeholder="e.g. Keep it concise, include deadline"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Sample Prompts */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest block mb-2 text-[var(--ink-3)]">
                  Quick Templates
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUGGESTED_PROMPTS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setPrompt(p);
                        handleGenerate(p);
                      }}
                      className="float-card !rounded-xl p-2.5 text-left text-xs text-[var(--ink-2)] hover:text-[var(--ink-1)] transition"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleClear}
                  className="btn-ghost text-xs text-[var(--ink-3)] hover:text-[var(--ink-1)]"
                >
                  Clear Fields
                </button>
                <button
                  onClick={() => handleGenerate()}
                  disabled={!prompt.trim() || generating || outOfCredits}
                  className="btn-gold flex items-center gap-2 disabled:opacity-40"
                >
                  {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>{generating ? "Generating Draft..." : "Generate Email Draft"}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: DRAFT & REVIEW */}
          {step === STEP.DRAFT && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-14 text-xs font-semibold text-[var(--ink-3)]">To:</span>
                  <input
                    type="text"
                    value={draft.to}
                    onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                    placeholder="recipient@example.com"
                    className={`flex-1 ${inputCls}`}
                  />
                  <button
                    onClick={() => setShowCc(!showCc)}
                    className="text-xs px-1 text-[var(--mane-gold)] font-medium hover:underline"
                  >
                    {showCc ? "Hide CC" : "Add CC"}
                  </button>
                </div>

                {showCc && (
                  <div className="flex items-center gap-2">
                    <span className="w-14 text-xs font-semibold text-[var(--ink-3)]">Cc:</span>
                    <input
                      type="text"
                      value={draft.cc}
                      onChange={(e) => setDraft({ ...draft, cc: e.target.value })}
                      placeholder="cc1@example.com, cc2@example.com"
                      className={`flex-1 ${inputCls}`}
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="w-14 text-xs font-semibold text-[var(--ink-3)]">Subject:</span>
                  <input
                    type="text"
                    value={draft.subject}
                    onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                    placeholder="Email subject..."
                    className={`flex-1 ${inputCls} font-medium`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[var(--ink-2)]">Email Body:</label>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--mane-gold-glow)] text-[var(--mane-gold)] border border-[rgba(214,168,79,0.3)]">
                    Tone: {draft.tone || tone}
                  </span>
                </div>
                <textarea
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  rows={8}
                  className={`${inputCls} resize-none leading-relaxed font-sans`}
                />
              </div>

              {draft.suggestions && (
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2">
                  <Sparkles size={14} className="shrink-0 mt-0.5 text-blue-400" />
                  <span>{draft.suggestions}</span>
                </div>
              )}

              {/* Draft Action Controls */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-[var(--edge-subtle)]">
                <div className="flex items-center gap-2">
                  <input type="file" ref={fileInputRef} hidden multiple onChange={handleFileAttach} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-ghost flex items-center gap-1.5 text-xs"
                  >
                    <Paperclip size={13} />
                    <span>Attach ({attachments.length})</span>
                  </button>
                  <button
                    onClick={copyDraft}
                    className="btn-ghost flex items-center gap-1.5 text-xs"
                  >
                    {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copied ? "Copied" : "Copy Draft"}</span>
                  </button>
                  <button
                    onClick={() => handleGenerate()}
                    disabled={generating}
                    className="btn-ghost flex items-center gap-1.5 text-xs text-[var(--mane-gold)]"
                    title="Regenerate with current settings"
                  >
                    <RefreshCw size={13} className={generating ? "animate-spin" : ""} />
                    <span>Regenerate</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => setStep(STEP.PROMPT)} className="btn-ghost text-xs">
                    Edit Prompt
                  </button>
                  <button onClick={() => handleSendEmail()} className="btn-gold flex items-center gap-1.5 text-xs">
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
              <div className="w-12 h-12 rounded-2xl bg-[var(--mane-gold-glow)] border border-[rgba(214,168,79,0.3)] flex items-center justify-center mx-auto text-[var(--mane-gold)]">
                <Lock size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--ink-1)]">Connect Gmail to Send</h3>
                <p className="text-xs mt-1 leading-relaxed text-[var(--ink-3)]">
                  Authorize Simha AI to send this drafted email securely from your verified Google account.
                </p>
              </div>
              <button
                onClick={handleRequestPermission}
                className="btn-simha w-full flex items-center justify-center gap-2 py-3"
              >
                <span>Authorize & Send</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* STEP 4: SENDING STATE */}
          {step === STEP.SENDING && (
            <div className="py-12 text-center space-y-3">
              <Loader2 size={32} className="animate-spin mx-auto text-[var(--mane-gold)]" />
              <p className="text-sm font-semibold text-[var(--ink-2)]">Sending your email securely via Gmail API...</p>
            </div>
          )}

          {/* STEP 5: SUCCESS STATE */}
          {step === STEP.SUCCESS && (
            <div className="py-8 text-center max-w-sm mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--ink-1)]">Email Sent Successfully!</h3>
                <p className="text-xs mt-1 text-[var(--ink-3)]">Your message has been delivered to {draft.to}.</p>
              </div>
              <button onClick={onClose} className="btn-gold w-full">Done</button>
            </div>
          )}

          {/* STEP 6: ERROR STATE */}
          {step === STEP.ERROR && (
            <div className="py-8 text-center max-w-sm mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--ink-1)]">Action Failed</h3>
                <p className="text-xs mt-1 text-[var(--ink-3)]">{errorMsg || "An unexpected error occurred."}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(STEP.PROMPT)} className="btn-ghost flex-1">
                  Revise Prompt
                </button>
                <button onClick={() => handleGenerate()} className="btn-gold flex-1">
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
