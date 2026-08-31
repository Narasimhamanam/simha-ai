import { useEffect, useRef, useState, useCallback } from "react";
import {
  Paperclip, Copy, Check, X, ArrowUp, ImageIcon,
  Sparkles, Code2, BookOpen, Rocket, FileText, ChevronDown,
  User, Play
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import API from "../services/api";
import VoiceInput from "./VoiceInput";
import SimhaCanvas3D from "./3d/SimhaCanvas3D";

function generateChatTitle(q) {
  const c = q.trim().replace(/[^\w\s]/gi, "").trim();
  const w = c.split(/\s+/).filter(Boolean);
  return (w.slice(0, 5).join(" ") || "New Chat").replace(/^./, s => s.toUpperCase());
}

const AGENTS = [
  { value: "study",        label: "Study Agent",        icon: BookOpen, color: "var(--mane-gold)" },
  { value: "coding",       label: "Coding Agent",       icon: Code2,    color: "var(--royal-violet)" },
  { value: "productivity", label: "Productivity Agent", icon: Rocket,   color: "var(--divine-cyan)" },
  { value: "divine",       label: "Krishna AI",         icon: Sparkles, color: "#38BDF8" },
];

const SUGGESTIONS = {
  study: [
    { text: "Explain machine learning fundamentals" },
    { text: "Quantum computing — qubits and superposition" },
    { text: "System design for distributed caches" },
  ],
  coding: [
    { text: "Build an async FastAPI REST service" },
    { text: "Optimize Three.js draw calls" },
    { text: "Docker multi-stage production build" },
    { text: "PostgreSQL query index analysis" },
  ],
  productivity: [
    { text: "Weekly execution roadmap with priorities" },
    { text: "Sprint retrospective summary template" },
    { text: "Deep work time-blocking strategy" },
  ],
  divine: [
    { text: "How to overcome overthinking" },
    { text: "Finding purpose amid uncertainty" },
    { text: "Detachment from outcomes — Gita 2.47" },
  ],
};

function ChatArea({
  theme, chats, setChats, activeChat, activeChatId, user,
  credits, fetchCredits, isPro, selectedAgent, setSelectedAgent,
  isMusicPlaying, setIsMusicPlaying,
}) {
  const outOfCredits = !isPro && credits !== undefined && credits <= 0;
  const isDivine = selectedAgent === "divine";
  const agentObj = AGENTS.find(a => a.value === selectedAgent) || AGENTS[0];

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState("");
  const [copiedMsgIdx, setCopiedMsgIdx] = useState(null);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [sendBurst, setSendBurst] = useState(false);

  const endRef = useRef(null);
  const fileRef = useRef(null);
  const imgRef = useRef(null);
  const taRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeChat?.messages, loading]);
  useEffect(() => { const ta = taRef.current; if (!ta) return; ta.style.height = "auto"; ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`; }, [input]);
  useEffect(() => { if (!showAgentPicker) return; const h = (e) => { if (!e.target.closest("#zg-agent-picker")) setShowAgentPicker(false); }; document.addEventListener("pointerdown", h); return () => document.removeEventListener("pointerdown", h); }, [showAgentPicker]);

  const copyCode = async (text, id) => { try { await navigator.clipboard.writeText(text); setCopiedCodeId(id); setTimeout(() => setCopiedCodeId(""), 2000); } catch {} };
  const copyMsg = async (text, idx) => { try { await navigator.clipboard.writeText(text); setCopiedMsgIdx(idx); setTimeout(() => setCopiedMsgIdx(null), 2000); } catch {} };

  const updateMessages = useCallback((fn) => {
    setChats(prev => prev.map(c => c.id !== activeChatId ? c : { ...c, messages: typeof fn === "function" ? fn(c.messages || []) : fn }));
  }, [activeChatId, setChats]);

  const uploadFile = async (file) => {
    if (!file) return null;
    const fd = new FormData(); fd.append("file", file);
    if (user?.email) fd.append("user_email", user.email);
    if (activeChatId) fd.append("chat_id", activeChatId);
    setUploading(true);
    try { return (await API.post("/upload-pdf", fd, { headers: { "Content-Type": "multipart/form-data" } })).data; }
    catch (e) { throw new Error(e?.response?.data?.detail || "Upload failed."); }
    finally { setUploading(false); }
  };

  const handleSend = async (overrideText) => {
    if (loading || uploading || !activeChatId) return;
    const text = (overrideText ?? input ?? "").trim();
    const file = selectedFile;
    const img = imagePreview;
    if (!text && !file && !img) return;

    const isFirst = (activeChat?.messages || []).length === 0;
    const userMsg = { role: "user", content: text || (img ? "Analyze this image" : `Analyze: ${file?.name}`), file: file?.name || null, image: img || null, agent: selectedAgent, timestamp: new Date().toISOString() };
    updateMessages(m => [...m, userMsg]);

    if (isFirst && text) {
      const title = generateChatTitle(text);
      setChats(p => p.map(c => c.id === activeChatId ? { ...c, title } : c));
      API.patch(`/rename-chat/${activeChatId}`, { title }).catch(() => {});
    }

    // Particle burst animation
    setSendBurst(true);
    setTimeout(() => setSendBurst(false), 600);

    setInput(""); setSelectedFile(null); setSelectedImage(null); setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
    if (imgRef.current) imgRef.current.value = "";
    setLoading(true);

    try {
      if (img) {
        updateMessages(m => [...m, { role: "assistant", content: "", agent: selectedAgent, timestamp: new Date().toISOString() }]);
        const baseURL = import.meta.env.VITE_BACKEND_URL || "https://simha-ai-backend.onrender.com";
        const res = await fetch(`${baseURL}/analyze-image`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_base64: img, prompt: text || "Describe this image.", user_email: user?.email || "" }),
        });
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || "Image analysis failed."); }
        const data = await res.json();
        updateMessages(m => { const u = [...m]; u[u.length - 1] = { role: "assistant", content: data.response || "No response.", agent: selectedAgent, timestamp: new Date().toISOString() }; return u; });
      } else {
        let doc = null;
        if (file) { try { doc = await uploadFile(file); } catch (e) { updateMessages(m => [...m, { role: "assistant", content: `⚠️ ${e.message}`, agent: selectedAgent }]); setLoading(false); return; } }
        updateMessages(m => [...m, { role: "assistant", content: "", agent: selectedAgent, timestamp: new Date().toISOString() }]);
        const baseURL = import.meta.env.VITE_BACKEND_URL || "https://simha-ai-backend.onrender.com";
        const res = await fetch(`${baseURL}/stream-chat`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: text, message: text, chat_id: activeChatId, user_id: user?.email || "guest", agent: selectedAgent, doc_context: doc?.context || null }),
        });
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || "Streaming failed."); }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          updateMessages(m => { const u = [...m]; u[u.length - 1] = { role: "assistant", content: acc, agent: selectedAgent, timestamp: new Date().toISOString() }; return u; });
        }
      }
    } catch (e) {
      console.error("Chat error:", e);
      updateMessages(m => { const u = [...m]; if (u[u.length - 1]?.role === "assistant" && !u[u.length - 1].content) u[u.length - 1] = { role: "assistant", content: "⚠️ Error generating response. Please retry.", agent: selectedAgent, isError: true }; return u; });
    } finally {
      setLoading(false);
      fetchCredits?.();
    }
  };

  const onKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const suggestions = SUGGESTIONS[selectedAgent] || SUGGESTIONS.study;
  const hasMessages = (activeChat?.messages || []).length > 0;

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative" style={{ background: "var(--void)" }}>

      {/* ── SCROLLABLE CONTENT ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4">
        <div className="max-w-[720px] mx-auto w-full">

          {/* ── EMPTY STATE: 3D Hero + Suggestions ── */}
          {!hasMessages && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center text-center pt-4 sm:pt-8"
            >
              {/* 3D Lion */}
              <div className="w-full max-w-lg -mb-4">
                <SimhaCanvas3D selectedAgent={selectedAgent} onSelectAgent={setSelectedAgent} mode="workspace" />
              </div>

              {/* Greeting */}
              <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight mb-2 ${isDivine ? "font-divine italic" : ""}`} style={{ color: "var(--ink-1)" }}>
                {isDivine ? "Seek guidance from Krishna AI" : "How can Simha assist you?"}
              </h1>
              <p className="text-xs text-[var(--ink-3)] max-w-md mb-8 leading-relaxed">
                {isDivine
                  ? "Timeless philosophical clarity on duty, focus, and inner resolve."
                  : "Autonomous multi-agent intelligence for research, engineering, and execution."}
              </p>

              {/* Suggestion chips — varying width, loose cluster */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(s.text)}
                    className="glass-panel !rounded-full px-4 py-2 text-xs font-medium text-[var(--ink-2)] hover:text-[var(--ink-1)] hover:border-[var(--edge-hover)] animate-drift transition-colors"
                    style={{ animationDelay: `${i * 0.8}s` }}
                  >
                    {s.text}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── MESSAGE STREAM ── */}
          {hasMessages && (
            <div className="py-4 space-y-5">
              {activeChat.messages.map((msg, idx) => {
                const isUser = msg.role === "user";
                const mAgent = AGENTS.find(a => a.value === (msg.agent || selectedAgent)) || AGENTS[0];
                const AgentIcon = mAgent.icon;

                return (
                  <div key={idx} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div className={`relative max-w-[88%] sm:max-w-[82%] ${isUser ? "" : "pl-4"}`}>

                      {/* AI hairline gradient bar on left edge */}
                      {!isUser && (
                        <div className={`agent-hairline ${msg.agent === "divine" ? "divine" : ""}`} />
                      )}

                      {/* Attribution */}
                      <div className={`flex items-center gap-2 mb-1 ${isUser ? "justify-end" : ""}`}>
                        {!isUser && (
                          <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: "var(--glass)", border: `1px solid var(--edge-subtle)` }}>
                            <AgentIcon size={11} style={{ color: mAgent.color }} />
                          </div>
                        )}
                        <span className="text-[11px] font-semibold" style={{ color: "var(--ink-3)" }}>
                          {isUser ? (user?.displayName?.split(" ")[0] || "You") : mAgent.label}
                        </span>
                        {!isUser && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "var(--ink-3)", border: "1px solid var(--edge-subtle)" }}>
                            Groq Qwen-27B
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className={`rounded-2xl transition-all ${
                        isUser
                          ? "bg-[rgba(214,168,79,0.08)] px-4 py-3 text-sm text-[var(--ink-1)]"
                          : "px-1 py-1"
                      }`}>
                        {msg.image && (
                          <div className="mb-3 rounded-xl overflow-hidden max-w-[260px]" style={{ border: "1px solid var(--edge-subtle)" }}>
                            <img src={msg.image} alt="Attachment" className="w-full object-cover max-h-[200px]" />
                          </div>
                        )}
                        {msg.file && (
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-3 text-xs glass-panel !rounded-lg">
                            <FileText size={13} style={{ color: "var(--mane-gold)" }} />
                            <span style={{ color: "var(--ink-2)" }}>{msg.file}</span>
                          </div>
                        )}

                        {isUser ? (
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        ) : (
                          <div className={`markdown-content ${msg.agent === "divine" ? "font-divine" : ""}`}>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                table: ({ children }) => <div className="markdown-table-wrapper"><table>{children}</table></div>,
                                code({ inline, className, children, ...props }) {
                                  const match = /language-(\w+)/.exec(className || "");
                                  const lang = match ? match[1] : "";
                                  const code = String(children).replace(/\n$/, "");
                                  const cId = `c_${idx}_${Math.random().toString(36).slice(2, 8)}`;
                                  if (!inline && match) {
                                    return (
                                      <div className="my-3 rounded-xl overflow-hidden glass-panel !rounded-xl" style={{ borderTop: `2px solid ${mAgent.color}` }}>
                                        <div className="flex items-center justify-between px-3.5 py-1.5 text-[11px] font-mono" style={{ borderBottom: "1px solid var(--edge-subtle)", color: "var(--ink-3)" }}>
                                          <span style={{ color: "var(--mane-gold)" }}>{lang}</span>
                                          <button onClick={() => copyCode(code, cId)} className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[rgba(255,255,255,0.06)] transition">
                                            {copiedCodeId === cId ? <><Check size={11} className="text-emerald-400" /><span className="text-emerald-400">Copied</span></> : <><Copy size={11} /><span>Copy</span></>}
                                          </button>
                                        </div>
                                        <div className="p-3 text-[13px] font-mono leading-relaxed overflow-x-auto">
                                          <SyntaxHighlighter style={oneDark} language={lang} PreTag="div" customStyle={{ margin: 0, padding: 0, background: "transparent", fontSize: "13px" }} {...props}>
                                            {code}
                                          </SyntaxHighlighter>
                                        </div>
                                      </div>
                                    );
                                  }
                                  return <code className={className} {...props}>{children}</code>;
                                },
                              }}
                            >
                              {msg.content || (loading && idx === activeChat.messages.length - 1 ? "Synthesizing..." : "")}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      {!isUser && msg.content && (
                        <div className="mt-2 flex items-center justify-between text-[10px]" style={{ color: "var(--ink-3)" }}>
                          <button onClick={() => copyMsg(msg.content, idx)} className="flex items-center gap-1 hover:text-[var(--ink-1)] transition">
                            {copiedMsgIdx === idx ? <><Check size={11} className="text-emerald-400" /><span className="text-emerald-400">Copied</span></> : <><Copy size={11} /><span>Copy</span></>}
                          </button>
                          <span className="font-mono">{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Thinking indicator */}
          {loading && (!activeChat?.messages || activeChat.messages[activeChat.messages.length - 1]?.role !== "assistant") && (
            <div className="flex items-center gap-3 mb-4 pl-4 animate-fade-in">
              <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: "var(--glass)", border: "1px solid var(--edge-subtle)" }}>
                <Sparkles size={11} style={{ color: "var(--mane-gold)" }} className="animate-spin" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--mane-gold)] animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--mane-gold)] animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--mane-gold)] animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="text-xs ml-1" style={{ color: "var(--ink-3)" }}>{agentObj.label} analyzing...</span>
              </div>
            </div>
          )}

          <div ref={endRef} className="h-4" />
        </div>
      </div>

      {/* ── FLOATING ZERO-G COMPOSER ── */}
      <div className="sticky bottom-0 z-20 px-4 sm:px-6 pb-4 sm:pb-5 pt-2" style={{ background: `linear-gradient(to top, var(--void) 60%, transparent)` }}>
        <div className="max-w-[680px] mx-auto w-full">

          {/* Attachment chips */}
          {(imagePreview || selectedFile || uploading) && (
            <div className="mb-2 flex items-center gap-2 flex-wrap animate-fade-in">
              {imagePreview && (
                <div className="flex items-center gap-2 px-2 py-1 rounded-xl glass-panel !rounded-xl">
                  <img src={imagePreview} alt="" className="w-5 h-5 rounded object-cover" />
                  <span className="text-[11px] text-[var(--ink-2)] max-w-[120px] truncate">{selectedImage?.name}</span>
                  <button onClick={() => { setSelectedImage(null); setImagePreview(null); }} className="text-[var(--ink-3)] hover:text-[var(--ink-1)]"><X size={12} /></button>
                </div>
              )}
              {selectedFile && (
                <div className="flex items-center gap-2 px-2 py-1 rounded-xl glass-panel !rounded-xl">
                  <FileText size={13} style={{ color: "var(--mane-gold)" }} />
                  <span className="text-[11px] text-[var(--ink-2)] max-w-[120px] truncate">{selectedFile.name}</span>
                  <button onClick={() => setSelectedFile(null)} className="text-[var(--ink-3)] hover:text-[var(--ink-1)]"><X size={12} /></button>
                </div>
              )}
              {uploading && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-medium" style={{ background: "var(--mane-gold-glow)", color: "var(--mane-gold)" }}>
                  <Sparkles size={11} className="animate-spin" /> Vectorizing...
                </div>
              )}
            </div>
          )}

          {/* Composer capsule */}
          <div className="zero-g-composer relative">
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={outOfCredits ? "Credits exhausted." : isDivine ? "Ask Krishna AI for guidance..." : `Command ${agentObj.label}...`}
              disabled={outOfCredits}
              rows={1}
              className="w-full resize-none bg-transparent px-4 pt-3 pb-1.5 text-sm outline-none leading-relaxed max-h-40 overflow-y-auto"
              style={{ color: "var(--ink-1)" }}
            />

            <div className="flex items-center justify-between px-3 pb-2.5 pt-0.5">
              {/* Left tools */}
              <div className="flex items-center gap-1">
                {/* Agent picker */}
                <div className="relative" id="zg-agent-picker">
                  <button
                    onClick={() => setShowAgentPicker(!showAgentPicker)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition"
                    style={{ color: "var(--ink-3)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--edge-subtle)" }}
                  >
                    <agentObj.icon size={12} style={{ color: agentObj.color }} />
                    <span className="hidden sm:inline">{agentObj.label}</span>
                    <ChevronDown size={11} className="opacity-50" />
                  </button>
                  <AnimatePresence>
                    {showAgentPicker && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.96 }}
                        transition={{ duration: 0.12 }}
                        className="absolute bottom-10 left-0 z-50 w-56 glass-panel p-1.5 space-y-0.5"
                      >
                        {AGENTS.map(a => {
                          const sel = selectedAgent === a.value;
                          const I = a.icon;
                          return (
                            <button key={a.value} onClick={() => { setSelectedAgent(a.value); setShowAgentPicker(false); }}
                              className={`w-full flex items-center gap-2 p-2 rounded-xl text-xs transition ${sel ? "font-bold" : ""}`}
                              style={{ color: sel ? "var(--ink-1)" : "var(--ink-3)", background: sel ? "rgba(214,168,79,0.08)" : "transparent" }}
                            >
                              <I size={14} style={{ color: sel ? a.color : "var(--ink-3)" }} />
                              <span>{a.label}</span>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <input type="file" ref={fileRef} hidden accept=".pdf,.txt,.docx,.md" onChange={(e) => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }} />
                <button onClick={() => fileRef.current?.click()} className="p-1.5 rounded-lg transition" style={{ color: "var(--ink-3)" }} title="Attach document">
                  <Paperclip size={15} />
                </button>

                <input type="file" ref={imgRef} hidden accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setSelectedImage(f); const r = new FileReader(); r.onloadend = () => setImagePreview(r.result); r.readAsDataURL(f); } }} />
                <button onClick={() => imgRef.current?.click()} className="p-1.5 rounded-lg transition" style={{ color: "var(--ink-3)" }} title="Attach image">
                  <ImageIcon size={15} />
                </button>

                <VoiceInput theme={theme} disabled={outOfCredits || loading} onTranscript={(t) => setInput(prev => prev ? `${prev} ${t}` : t)} />
              </div>

              {/* Send */}
              <motion.button
                onClick={() => handleSend()}
                disabled={(!input.trim() && !selectedFile && !selectedImage) || loading || outOfCredits}
                className="p-2 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: (input.trim() || selectedFile || selectedImage) && !loading && !outOfCredits
                    ? `linear-gradient(135deg, var(--mane-gold), var(--mane-gold-bright))`
                    : "rgba(255,255,255,0.04)",
                  color: (input.trim() || selectedFile || selectedImage) && !loading && !outOfCredits ? "#000" : "var(--ink-3)",
                  boxShadow: (input.trim() || selectedFile || selectedImage) && !loading ? "0 2px 16px -2px var(--mane-gold-glow)" : "none",
                }}
                whileTap={{ scale: 0.92 }}
                animate={sendBurst ? { scale: [1, 1.2, 0.95, 1] } : {}}
                transition={{ duration: 0.35 }}
              >
                {loading ? <Sparkles size={15} className="animate-spin" /> : <ArrowUp size={15} strokeWidth={2.5} />}
              </motion.button>
            </div>
          </div>

          <p className="mt-2 text-center text-[10px] tracking-wide" style={{ color: "var(--ink-3)", opacity: 0.5 }}>
            Simha AI — Zero-G Sanctum
          </p>
        </div>
      </div>
    </div>
  );
}

export default ChatArea;
