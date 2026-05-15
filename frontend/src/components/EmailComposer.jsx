import { useState, useRef } from "react";
import {
  Mail, Send, X, Paperclip, Sparkles, Loader2,
  CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
  RefreshCw, Lock
} from "lucide-react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, gmailProvider } from "../firebase";
import API from "../services/api";

// ── Gmail API helpers ──────────────────────────────────────────
function encodeEmailToBase64(to, cc, subject, body, fromName, attachments = []) {
  const boundary = "simha_ai_boundary_" + Date.now();
  const hasAttachments = attachments.length > 0;

  // Build headers — filter null (cc when empty) but NOT the blank line separator
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
    // MIME multipart: blank line after headers, then boundary parts
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
    // Plain text: MUST have exactly one blank line (CRLF CRLF) between headers and body
    raw = headers + "\r\n\r\n" + body;
  }

  // URL-safe base64 encode (Gmail API requirement)
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

// ── STATES ─────────────────────────────────────────────────────
const STEP = {
  PROMPT: "prompt",
  DRAFT: "draft",
  PERMISSION: "permission",
  SENDING: "sending",
  SUCCESS: "success",
  ERROR: "error",
};

export default function EmailComposer({ theme, profile, onClose }) {
  const dark = theme === "dark";

  const [step, setStep] = useState(STEP.PROMPT);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState({ to: "", cc: "", subject: "", body: "", tone: "formal", suggestions: "" });
  const [attachments, setAttachments] = useState([]);
  const [accessToken, setAccessToken] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showCc, setShowCc] = useState(false);

  const fileInputRef = useRef(null);

  // ── Step 1: Generate draft from prompt ──
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const res = await API.post("/generate-email", {
        prompt: prompt.trim(),
        sender_name: profile?.nickname || "",
      });
      setDraft(res.data);
      setStep(STEP.DRAFT);
    } catch (err) {
      setErrorMsg("AI couldn't generate the email. Please try again.");
      setStep(STEP.ERROR);
    } finally {
      setGenerating(false);
    }
  };

  // ── Step 2: Handle file attachments ──
  const handleFileAdd = async (e) => {
    const files = Array.from(e.target.files || []);
    const processed = await Promise.all(
      files.map(async (f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
        data: await fileToBase64(f),
      }))
    );
    setAttachments((prev) => [...prev, ...processed]);
    e.target.value = "";
  };

  const removeAttachment = (name) =>
    setAttachments((prev) => prev.filter((a) => a.name !== name));

  // ── Step 3: Request Gmail permission ──
  const handleRequestPermission = async () => {
    setStep(STEP.PERMISSION);
    try {
      const result = await signInWithPopup(auth, gmailProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) throw new Error("No access token received.");
      setAccessToken(credential.accessToken);
      // Auto-proceed to send after permission
      await sendEmail(credential.accessToken);
    } catch (err) {
      if (err.code === "auth/popup-closed-by-user") {
        setStep(STEP.DRAFT);
        return;
      }
      setErrorMsg(err.message || "Permission denied.");
      setStep(STEP.ERROR);
    }
  };

  // ── Step 4: Send via Gmail API ──
  const sendEmail = async (token) => {
    setStep(STEP.SENDING);
    try {
      const senderName = profile?.nickname || profile?.email || "";
      const encoded = encodeEmailToBase64(
        draft.to, draft.cc, draft.subject, draft.body, senderName, attachments
      );

      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token || accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: encoded }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Gmail API error.");
      }

      setStep(STEP.SUCCESS);
    } catch (err) {
      setErrorMsg(err.message || "Failed to send email.");
      setStep(STEP.ERROR);
    }
  };

  // ── Confirm & send ──
  const handleConfirmSend = async () => {
    if (!draft.to.trim()) {
      setErrorMsg("Please enter a recipient email address.");
      return;
    }
    if (accessToken) {
      await sendEmail(accessToken);
    } else {
      await handleRequestPermission();
    }
  };

  // ── UI ──────────────────────────────────────────────────────
  const panelCls = `fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4`;
  const cardCls = `w-full sm:max-w-2xl max-h-[100dvh] sm:max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl border shadow-2xl overflow-hidden ${
    dark ? "bg-[#111111] border-gray-800" : "bg-white border-gray-200"
  }`;

  return (
    <div className={panelCls}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className={`relative ${cardCls}`}>
        {/* ── HEADER ── */}
        <div className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${dark ? "border-gray-800" : "border-gray-100"}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Mail size={15} className="text-white" />
            </div>
            <div>
              <h2 className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>AI Email Composer</h2>
              <p className={`text-[10px] ${dark ? "text-gray-500" : "text-gray-400"}`}>Powered by Simha AI</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl transition ${dark ? "hover:bg-white/8 text-gray-500" : "hover:bg-gray-100 text-gray-400"}`}>
            <X size={16} />
          </button>
        </div>

        {/* ── BODY ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── STEP: PROMPT ── */}
          {step === STEP.PROMPT && (
            <div className="p-5 space-y-4">
              <div>
                <label className={`text-xs font-semibold mb-2 block ${dark ? "text-gray-300" : "text-gray-700"}`}>
                  ✍️ Describe the email you want to send
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`e.g. "Send a follow-up email to hr@company.com asking about my interview result for Software Engineer role"`}
                  rows={5}
                  style={{ fontSize: "16px" }}
                  className={`w-full rounded-xl border px-4 py-3 text-sm leading-6 outline-none resize-none transition ${
                    dark
                      ? "bg-[#1a1a1a] border-gray-800 text-white placeholder:text-gray-600 focus:border-blue-600"
                      : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500"
                  }`}
                  onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleGenerate(); }}
                />
                <p className={`text-[10px] mt-1.5 ${dark ? "text-gray-600" : "text-gray-400"}`}>
                  Tip: Include recipient email, context, and desired tone for best results. Ctrl+Enter to generate.
                </p>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || generating}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {generating ? "Generating your email..." : "Generate Email Draft"}
              </button>
            </div>
          )}

          {/* ── STEP: DRAFT ── */}
          {step === STEP.DRAFT && (
            <div className="p-5 space-y-3">
              {draft.suggestions && (
                <div className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl text-xs ${dark ? "bg-blue-950/50 border border-blue-900 text-blue-300" : "bg-blue-50 border border-blue-100 text-blue-700"}`}>
                  <Sparkles size={13} className="shrink-0 mt-0.5" />
                  {draft.suggestions}
                </div>
              )}

              {/* TO */}
              <div>
                <label className={`text-[11px] font-semibold mb-1 block ${dark ? "text-gray-400" : "text-gray-500"}`}>TO *</label>
                <input
                  type="email"
                  value={draft.to}
                  onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
                  placeholder="recipient@example.com"
                  style={{ fontSize: "16px" }}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition ${
                    dark ? "bg-[#1a1a1a] border-gray-800 text-white placeholder:text-gray-600 focus:border-blue-600" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500"
                  }`}
                />
              </div>

              {/* CC toggle */}
              <button
                onClick={() => setShowCc((v) => !v)}
                className={`flex items-center gap-1 text-[11px] ${dark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"} transition`}
              >
                {showCc ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showCc ? "Hide CC" : "Add CC"}
              </button>

              {showCc && (
                <div>
                  <label className={`text-[11px] font-semibold mb-1 block ${dark ? "text-gray-400" : "text-gray-500"}`}>CC</label>
                  <input
                    type="email"
                    value={draft.cc}
                    onChange={(e) => setDraft((d) => ({ ...d, cc: e.target.value }))}
                    placeholder="cc@example.com"
                    style={{ fontSize: "16px" }}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition ${
                      dark ? "bg-[#1a1a1a] border-gray-800 text-white placeholder:text-gray-600 focus:border-blue-600" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500"
                    }`}
                  />
                </div>
              )}

              {/* SUBJECT */}
              <div>
                <label className={`text-[11px] font-semibold mb-1 block ${dark ? "text-gray-400" : "text-gray-500"}`}>SUBJECT</label>
                <input
                  type="text"
                  value={draft.subject}
                  onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
                  style={{ fontSize: "16px" }}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition ${
                    dark ? "bg-[#1a1a1a] border-gray-800 text-white placeholder:text-gray-600 focus:border-blue-600" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500"
                  }`}
                />
              </div>

              {/* BODY */}
              <div>
                <label className={`text-[11px] font-semibold mb-1 block ${dark ? "text-gray-400" : "text-gray-500"}`}>BODY</label>
                <textarea
                  value={draft.body}
                  onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                  rows={9}
                  style={{ fontSize: "16px" }}
                  className={`w-full rounded-xl border px-3.5 py-3 text-sm leading-6 outline-none resize-none transition ${
                    dark ? "bg-[#1a1a1a] border-gray-800 text-white placeholder:text-gray-600 focus:border-blue-600" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500"
                  }`}
                />
              </div>

              {/* ATTACHMENTS */}
              <div>
                <label className={`text-[11px] font-semibold mb-2 block ${dark ? "text-gray-400" : "text-gray-500"}`}>ATTACHMENTS</label>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((att) => (
                    <div key={att.name} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${dark ? "bg-[#222] text-gray-300 border border-gray-800" : "bg-gray-100 text-gray-700 border border-gray-200"}`}>
                      <Paperclip size={11} />
                      <span className="max-w-[120px] truncate">{att.name}</span>
                      <button onClick={() => removeAttachment(att.name)} className="ml-1 text-red-400 hover:text-red-300 transition">
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                  <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition touch-manipulation ${
                    dark ? "bg-[#1f1f1f] text-gray-400 hover:text-gray-200 border border-gray-800" : "bg-gray-100 text-gray-500 hover:text-gray-700 border border-gray-200"
                  }`}>
                    <input ref={fileInputRef} type="file" multiple hidden onChange={handleFileAdd} />
                    <Paperclip size={12} />
                    Attach file
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: PERMISSION ── */}
          {step === STEP.PERMISSION && (
            <div className="p-8 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <Lock size={28} className="text-white" />
              </div>
              <div>
                <h3 className={`text-base font-semibold mb-1.5 ${dark ? "text-white" : "text-gray-900"}`}>Gmail Permission Required</h3>
                <p className={`text-xs leading-5 max-w-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>
                  A Google sign-in popup will appear asking you to grant Simha AI permission to send emails on your behalf.
                  <strong className={dark ? " text-orange-400" : " text-orange-600"}> We never store your emails or credentials.</strong>
                </p>
              </div>
              <Loader2 size={24} className="animate-spin text-blue-500" />
              <p className={`text-xs ${dark ? "text-gray-600" : "text-gray-400"}`}>Waiting for your approval in the popup...</p>
            </div>
          )}

          {/* ── STEP: SENDING ── */}
          {step === STEP.SENDING && (
            <div className="p-8 flex flex-col items-center text-center gap-4">
              <Loader2 size={40} className="animate-spin text-blue-500" />
              <div>
                <h3 className={`text-base font-semibold ${dark ? "text-white" : "text-gray-900"}`}>Sending your email...</h3>
                <p className={`text-xs mt-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>Please wait a moment.</p>
              </div>
            </div>
          )}

          {/* ── STEP: SUCCESS ── */}
          {step === STEP.SUCCESS && (
            <div className="p-8 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 size={36} className="text-green-500" />
              </div>
              <div>
                <h3 className={`text-base font-semibold ${dark ? "text-white" : "text-gray-900"}`}>Email Sent!</h3>
                <p className={`text-xs mt-1.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>
                  Your email to <span className="font-medium">{draft.to}</span> was sent successfully.
                </p>
              </div>
              <button
                onClick={() => { setStep(STEP.PROMPT); setPrompt(""); setDraft({ to: "", cc: "", subject: "", body: "" }); setAttachments([]); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium hover:opacity-90 transition touch-manipulation"
              >
                <RefreshCw size={14} />
                Send Another
              </button>
            </div>
          )}

          {/* ── STEP: ERROR ── */}
          {step === STEP.ERROR && (
            <div className="p-8 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle size={36} className="text-red-500" />
              </div>
              <div>
                <h3 className={`text-base font-semibold ${dark ? "text-white" : "text-gray-900"}`}>Something went wrong</h3>
                <p className={`text-xs mt-1.5 max-w-xs ${dark ? "text-red-400" : "text-red-600"}`}>{errorMsg}</p>
              </div>
              <button
                onClick={() => setStep(STEP.PROMPT)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-medium transition touch-manipulation"
              >
                <RefreshCw size={14} />
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* ── FOOTER ACTIONS ── */}
        {step === STEP.DRAFT && (
          <div className={`shrink-0 px-5 py-4 border-t flex gap-3 ${dark ? "border-gray-800 bg-[#0e0e0e]" : "border-gray-100 bg-gray-50"}`}>
            <button
              onClick={() => setStep(STEP.PROMPT)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border transition touch-manipulation ${
                dark ? "border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600" : "border-gray-200 text-gray-500 hover:text-gray-700"
              }`}
            >
              <RefreshCw size={13} />
              Regenerate
            </button>

            <button
              onClick={handleConfirmSend}
              disabled={!draft.to.trim()}
              className="flex-1 flex items-center justify-center gap-2.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
            >
              <Send size={15} />
              {accessToken ? "Send Email" : "Grant Permission & Send"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
