import { useEffect, useRef, useState, useCallback } from "react";
import {
  Paperclip, Copy, Check, X, ArrowUp, ImageIcon,
  Sparkles, Code2, BookOpen, Rocket, FileText, ChevronDown,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import API from "../services/api";
import VoiceInput from "./VoiceInput";
import AstraCanvas3D from "./3d/AstraCanvas3D";

function generateChatTitle(q) {
  const c = q.trim().replace(/[^\w\s]/gi, "").trim();
  const w = c.split(/\s+/).filter(Boolean);
  return (w.slice(0, 5).join(" ") || "New Workspace").replace(/^./, (s) => s.toUpperCase());
}

const AGENTS = [
  { value: "study", label: "Astra Study", icon: BookOpen, color: "#2DD4BF" },
  { value: "coding", label: "Astra Code", icon: Code2, color: "#818CF8" },
  { value: "productivity", label: "Productivity", icon: Rocket, color: "#A78BFA" },
  { value: "wisdom", label: "Astra Wisdom", icon: Sparkles, color: "#00F0FF" },
];

const SUGGESTIONS = {
  study: [
    { text: "Explain transformer attention mechanisms step-by-step" },
    { text: "Dynamic programming: Knapsack problem optimal recurrence" },
    { text: "Distributed consensus algorithms (Raft vs Paxos)" },
  ],
  coding: [
    { text: "Build an asynchronous FastAPI REST router with dependency injection" },
    { text: "Refactor React state management to custom hooks" },
    { text: "Python thread-safe connection pool design" },
    { text: "Optimize SQL compound index query performance" },
  ],
  productivity: [
    { text: "Weekly sprint execution roadmap with priority buckets" },
    { text: "Deep work time-blocking schedule for engineering" },
    { text: "Executive summary template for leadership updates" },
  ],
  wisdom: [
    { text: "How to maintain calm focus under high stakes" },
    { text: "Action without anxiety: timeless perspective on duty" },
    { text: "Overcoming cognitive fatigue and decision paralysis" },
  ],
};

export default function ChatArea({
  theme,
  setChats,
  activeChat,
  activeChatId,
  user,
  usage,
  fetchUsage,
  isPro,
  onNavigateToPricing,
  selectedAgent,
  setSelectedAgent,
}) {
  const quotaReached = !isPro && usage?.quota_reached;
  const agentObj = AGENTS.find((a) => a.value === selectedAgent) || AGENTS[0];

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState("");
  const [copiedMsgIdx, setCopiedMsgIdx] = useState(null);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const endRef = useRef(null);
  const fileRef = useRef(null);
  const imgRef = useRef(null);
  const taRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, loading]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  const copyCode = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCodeId(id);
      setTimeout(() => setCopiedCodeId(""), 2000);
    } catch {
      /* clipboard write error ignored */
    }
  };

  const copyMsg = async (text, idx) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsgIdx(idx);
      setTimeout(() => setCopiedMsgIdx(null), 2000);
    } catch {
      /* clipboard write error ignored */
    }
  };

  const updateMessages = useCallback(
    (fn) => {
      setChats((prev) =>
        prev.map((c) =>
          c.id !== activeChatId
            ? c
            : { ...c, messages: typeof fn === "function" ? fn(c.messages || []) : fn }
        )
      );
    },
    [activeChatId, setChats]
  );

  const uploadFile = async (file) => {
    if (!file) return null;
    if (file.size > 30 * 1024 * 1024) {
      throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 30MB document size limit.`);
    }
    const fd = new FormData();
    fd.append("file", file);
    if (user?.email) fd.append("user_email", user.email);
    if (activeChatId) fd.append("chat_id", activeChatId);
    setUploading(true);
    try {
      const res = await API.post("/upload-pdf", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    } catch (e) {
      throw new Error(e?.response?.data?.detail?.message || e?.response?.data?.detail || "Upload failed.", { cause: e });
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async (overrideText) => {
    if (loading || uploading || !activeChatId) return;
    const text = (overrideText ?? input ?? "").trim();
    const file = selectedFile;
    const img = imagePreview;
    if (!text && !file && !img) return;

    setErrorMessage("");
    const isFirst = (activeChat?.messages || []).length === 0;
    const userMsg = {
      role: "user",
      content: text || (img ? "Analyze this image" : `Analyze: ${file?.name}`),
      file: file?.name || null,
      image: img || null,
      agent: selectedAgent,
      timestamp: new Date().toISOString(),
    };
    updateMessages((m) => [...m, userMsg]);

    if (isFirst && text) {
      const title = generateChatTitle(text);
      setChats((p) => p.map((c) => (c.id === activeChatId ? { ...c, title } : c)));
      API.patch(`/rename-chat/${activeChatId}`, { title }).catch(() => {});
    }

    setInput("");
    setSelectedFile(null);
    setSelectedImage(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
    if (imgRef.current) imgRef.current.value = "";
    setLoading(true);

    try {
      if (img) {
        updateMessages((m) => [
          ...m,
          { role: "assistant", content: "", agent: selectedAgent, timestamp: new Date().toISOString() },
        ]);
        const baseURL = import.meta.env.VITE_BACKEND_URL || "https://simha-ai-backend.onrender.com";
        const token = await user?.getIdToken?.().catch(() => null);
        const authHeaders = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(user?.email ? { "X-User-Email": user.email } : {}),
        };

        const res = await fetch(`${baseURL}/analyze-image`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            image_base64: img,
            prompt: text || "Describe this image in detail.",
            user_email: user?.email || "guest",
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail?.message || err.detail || "Image analysis failed.");
        }
        const data = await res.json();
        updateMessages((m) => {
          const u = [...m];
          u[u.length - 1] = {
            role: "assistant",
            content: data.response || "No response.",
            agent: selectedAgent,
            timestamp: new Date().toISOString(),
          };
          return u;
        });
      } else {
        let doc = null;
        if (file) {
          try {
            doc = await uploadFile(file);
          } catch (e) {
            updateMessages((m) => [
              ...m,
              { role: "assistant", content: `⚠️ ${e.message}`, agent: selectedAgent },
            ]);
            setLoading(false);
            return;
          }
        }

        updateMessages((m) => [
          ...m,
          { role: "assistant", content: "", agent: selectedAgent, timestamp: new Date().toISOString() },
        ]);

        const baseURL = import.meta.env.VITE_BACKEND_URL || "https://simha-ai-backend.onrender.com";
        const token = await user?.getIdToken?.().catch(() => null);
        const authHeaders = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(user?.email ? { "X-User-Email": user.email } : {}),
        };

        const res = await fetch(`${baseURL}/stream-chat`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            query: text,
            message: text,
            chat_id: activeChatId,
            user_id: user?.email || "guest",
            agent: selectedAgent,
            doc_context: doc?.context || null,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const msg = err.detail?.message || err.detail || "Streaming error.";
          if (res.status === 402) {
            setErrorMessage("Daily usage limit reached. Upgrade to the Astra 7-Day Pass for 100 daily messages.");
          }
          throw new Error(msg);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          updateMessages((m) => {
            const u = [...m];
            u[u.length - 1] = {
              role: "assistant",
              content: acc,
              agent: selectedAgent,
              timestamp: new Date().toISOString(),
            };
            return u;
          });
        }
      }
    } catch (e) {
      console.error("Astra Chat error:", e);
      updateMessages((m) => {
        const u = [...m];
        if (u[u.length - 1]?.role === "assistant" && !u[u.length - 1].content) {
          u[u.length - 1] = {
            role: "assistant",
            content: `⚠️ ${e.message || "Error generating response. Please retry."}`,
            agent: selectedAgent,
            isError: true,
          };
        }
        return u;
      });
    } finally {
      setLoading(false);
      fetchUsage?.();
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = SUGGESTIONS[selectedAgent] || SUGGESTIONS.study;
  const hasMessages = (activeChat?.messages || []).length > 0;

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative bg-[var(--void)]">
      
      {/* ── QUOTA WARNING BANNER ── */}
      {quotaReached && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <Lock size={14} />
            <span>Daily free quota reached (10/10 messages). Upgrade for 100 messages/day.</span>
          </div>
          <button
            onClick={onNavigateToPricing}
            className="btn-astra !py-1 !px-3 text-[11px] font-bold"
          >
            Get 7-Day Pass — ₹99
          </button>
        </div>
      )}

      {/* ── SCROLLABLE CONVERSATION AREA ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4">
        <div className="max-w-[720px] mx-auto w-full">
          
          {/* EMPTY STATE */}
          {!hasMessages && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center text-center pt-2 sm:pt-6"
            >
              {/* 3D Constellation Core */}
              <div className="w-full max-w-md h-52 -mb-2">
                <AstraCanvas3D selectedAgent={selectedAgent} mode="workspace" />
              </div>

              {/* Greeting */}
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 text-[var(--ink-1)]">
                How can Astra assist you today?
              </h1>
              <p className="text-xs text-[var(--ink-3)] max-w-md mb-8 leading-relaxed">
                Autonomous multi-agent intelligence for software engineering, study, document research, and execution.
              </p>

              {/* Dynamic suggestion chips */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(s.text)}
                    className="glass-panel !rounded-full px-4 py-2 text-xs font-medium text-[var(--ink-2)] hover:text-[var(--ink-1)] hover:border-[var(--edge-hover)] transition-colors"
                  >
                    {s.text}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* MESSAGE STREAM */}
          {hasMessages && (
            <div className="py-4 space-y-5">
              {activeChat.messages.map((msg, idx) => {
                const isUser = msg.role === "user";
                const mAgent = AGENTS.find((a) => a.value === (msg.agent || selectedAgent)) || AGENTS[0];
                const AgentIcon = mAgent.icon;

                return (
                  <div key={idx} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div className={`relative max-w-[88%] sm:max-w-[82%] ${isUser ? "" : "pl-4"}`}>
                      
                      {!isUser && <div className="agent-hairline" />}

                      {/* Header Attribution */}
                      <div className={`flex items-center gap-2 mb-1 ${isUser ? "justify-end" : ""}`}>
                        {!isUser && (
                          <div
                            className="w-5 h-5 rounded-md flex items-center justify-center glass-panel"
                          >
                            <AgentIcon size={11} style={{ color: mAgent.color }} />
                          </div>
                        )}
                        <span className="text-[11px] font-semibold text-[var(--ink-3)]">
                          {isUser ? user?.displayName?.split(" ")[0] || "You" : mAgent.label}
                        </span>
                        {!isUser && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-[var(--ink-3)] border border-[var(--edge-subtle)]">
                            Astra Engine
                          </span>
                        )}
                      </div>

                      {/* Bubble Content */}
                      <div
                        className={`rounded-2xl transition-all ${
                          isUser
                            ? "bg-[rgba(0,240,255,0.1)] border border-[var(--edge)] px-4 py-3 text-sm text-[var(--ink-1)]"
                            : "px-1 py-1"
                        }`}
                      >
                        {msg.image && (
                          <div className="mb-3 rounded-xl overflow-hidden max-w-[260px] border border-[var(--edge-subtle)]">
                            <img src={msg.image} alt="Uploaded attachment" className="w-full object-cover max-h-[200px]" />
                          </div>
                        )}

                        {msg.file && (
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-3 text-xs glass-panel">
                            <FileText size={13} className="text-[var(--astra-cyan)]" />
                            <span className="text-[var(--ink-2)]">{msg.file}</span>
                          </div>
                        )}

                        {isUser ? (
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        ) : (
                          <div className="markdown-content">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                table: ({ children }) => (
                                  <div className="markdown-table-wrapper"><table>{children}</table></div>
                                ),
                                code({ inline, className, children, ...props }) {
                                  const match = /language-(\w+)/.exec(className || "");
                                  const lang = match ? match[1] : "";
                                  const code = String(children).replace(/\n$/, "");
                                  const cId = `c_${idx}_${Math.random().toString(36).slice(2, 8)}`;
                                  if (!inline && match) {
                                    return (
                                      <div className="my-3 rounded-xl overflow-hidden glass-panel border-t-2 border-t-[var(--astra-cyan)]">
                                        <div className="flex items-center justify-between px-3.5 py-1.5 text-[11px] font-mono border-b border-[var(--edge-subtle)] text-[var(--ink-3)]">
                                          <span className="text-[var(--astra-cyan)]">{lang}</span>
                                          <button
                                            onClick={() => copyCode(code, cId)}
                                            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/5 transition"
                                          >
                                            {copiedCodeId === cId ? (
                                              <>
                                                <Check size={11} className="text-emerald-400" />
                                                <span className="text-emerald-400">Copied</span>
                                              </>
                                            ) : (
                                              <>
                                                <Copy size={11} />
                                                <span>Copy</span>
                                              </>
                                            )}
                                          </button>
                                        </div>
                                        <div className="p-3 text-[13px] font-mono leading-relaxed overflow-x-auto">
                                          <SyntaxHighlighter
                                            style={oneDark}
                                            language={lang}
                                            PreTag="div"
                                            customStyle={{ margin: 0, padding: 0, background: "transparent", fontSize: "13px" }}
                                            {...props}
                                          >
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
                              {msg.content || (loading && idx === activeChat.messages.length - 1 ? "Synthesizing response..." : "")}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      {!isUser && msg.content && (
                        <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--ink-3)]">
                          <button
                            onClick={() => copyMsg(msg.content, idx)}
                            className="flex items-center gap-1 hover:text-[var(--ink-1)] transition"
                          >
                            {copiedMsgIdx === idx ? (
                              <>
                                <Check size={11} className="text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={11} />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                          <span className="font-mono">
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Thinking / Processing indicator */}
          {loading && (!activeChat?.messages || activeChat.messages[activeChat.messages.length - 1]?.role !== "assistant") && (
            <div className="flex items-center gap-3 mb-4 pl-4 animate-fade-in">
              <div className="w-5 h-5 rounded-md flex items-center justify-center glass-panel">
                <Sparkles size={11} className="text-[var(--astra-cyan)] animate-spin" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--astra-cyan)] animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--astra-cyan)] animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--astra-cyan)] animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="text-xs ml-1 text-[var(--ink-3)]">{agentObj.label} analyzing...</span>
              </div>
            </div>
          )}

          <div ref={endRef} className="h-4" />
        </div>
      </div>

      {/* ── FLOATING COMPOSER CAPSULE ── */}
      <div className="sticky bottom-0 z-20 px-4 sm:px-6 pb-4 sm:pb-5 pt-2 bg-gradient-to-t from-[var(--void)] via-[var(--void)]/90 to-transparent">
        <div className="max-w-[680px] mx-auto w-full">
          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between animate-fade-in">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage("")} className="text-[10px] underline ml-2 hover:text-red-300">Dismiss</button>
            </div>
          )}

          {/* Attachment Chips */}
          {(imagePreview || selectedFile || uploading) && (
            <div className="mb-2 flex items-center gap-2 flex-wrap animate-fade-in">
              {imagePreview && (
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl glass-panel">
                  <img src={imagePreview} alt="" className="w-5 h-5 rounded object-cover" />
                  <span className="text-[11px] text-[var(--ink-2)] max-w-[120px] truncate">{selectedImage?.name}</span>
                  <button onClick={() => { setSelectedImage(null); setImagePreview(null); }} className="text-[var(--ink-3)] hover:text-[var(--ink-1)]">
                    <X size={12} />
                  </button>
                </div>
              )}
              {selectedFile && (
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl glass-panel">
                  <FileText size={13} className="text-[var(--astra-cyan)]" />
                  <span className="text-[11px] text-[var(--ink-2)] max-w-[120px] truncate">{selectedFile.name}</span>
                  <button onClick={() => setSelectedFile(null)} className="text-[var(--ink-3)] hover:text-[var(--ink-1)]">
                    <X size={12} />
                  </button>
                </div>
              )}
              {uploading && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-medium bg-[var(--astra-glow)] text-[var(--astra-cyan)]">
                  <Sparkles size={11} className="animate-spin" /> Vectorizing document...
                </div>
              )}
            </div>
          )}

          {/* Composer Box */}
          <div className="zero-g-composer relative">
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={
                quotaReached
                  ? "Daily message limit reached. Upgrade to Astra Pass for 100/day."
                  : `Ask ${agentObj.label}...`
              }
              disabled={quotaReached}
              rows={1}
              className="w-full resize-none bg-transparent px-4 pt-3 pb-1.5 text-sm outline-none leading-relaxed max-h-40 overflow-y-auto text-[var(--ink-1)]"
            />

            <div className="flex items-center justify-between px-3 pb-2.5 pt-0.5">
              <div className="flex items-center gap-1">
                
                {/* Agent Selector Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowAgentPicker(!showAgentPicker)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold transition text-[var(--ink-3)] bg-white/5 border border-[var(--edge-subtle)]"
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
                        className="absolute bottom-10 left-0 z-50 w-56 glass-panel p-1.5 space-y-0.5 shadow-xl"
                      >
                        {AGENTS.map((a) => {
                          const sel = selectedAgent === a.value;
                          const I = a.icon;
                          return (
                            <button
                              key={a.value}
                              onClick={() => {
                                setSelectedAgent(a.value);
                                setShowAgentPicker(false);
                              }}
                              className={`w-full flex items-center gap-2 p-2 rounded-xl text-xs transition ${
                                sel ? "font-bold bg-[var(--astra-glow)] text-[var(--ink-1)]" : "text-[var(--ink-3)] hover:text-[var(--ink-1)]"
                              }`}
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

                {/* Attach Document (Astra Docs) */}
                <input
                  type="file"
                  ref={fileRef}
                  hidden
                  accept=".pdf,.docx,.doc,.txt,.md,.csv,.rst"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                  }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="p-1.5 rounded-lg transition text-[var(--ink-3)] hover:text-[var(--ink-1)] hover:bg-white/5"
                  title="Attach document up to 30MB (PDF, DOCX, TXT, CSV)"
                >
                  <Paperclip size={15} />
                </button>

                {/* Attach Image (Astra Vision) */}
                <input
                  type="file"
                  ref={imgRef}
                  hidden
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setSelectedImage(f);
                      const r = new FileReader();
                      r.onloadend = () => setImagePreview(r.result);
                      r.readAsDataURL(f);
                    }
                  }}
                />
                <button
                  onClick={() => imgRef.current?.click()}
                  className="p-1.5 rounded-lg transition text-[var(--ink-3)] hover:text-[var(--ink-1)] hover:bg-white/5"
                  title="Attach image for visual analysis"
                >
                  <ImageIcon size={15} />
                </button>

                <VoiceInput
                  theme={theme}
                  disabled={quotaReached || loading}
                  onTranscript={(t) => setInput((prev) => (prev ? `${prev} ${t}` : t))}
                />
              </div>

              {/* Send Action */}
              <button
                onClick={() => handleSend()}
                disabled={(!input.trim() && !selectedFile && !selectedImage) || loading || quotaReached}
                className="btn-astra !p-2 !rounded-xl disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {loading ? <Sparkles size={15} className="animate-spin" /> : <ArrowUp size={15} strokeWidth={2.5} />}
              </button>
            </div>
          </div>

          <p className="mt-2 text-center text-[10px] tracking-wide text-[var(--ink-3)] opacity-60">
            GPT 6 Astra — Independent AI Workspace · Not affiliated with OpenAI
          </p>
        </div>
      </div>
    </div>
  );
}
