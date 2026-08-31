import { useEffect, useRef, useState, useCallback } from "react";
import {
  Paperclip, Copy, Check, X, ArrowUp, ImageIcon, Volume2, VolumeX,
  Sparkles, Code2, BookOpen, Rocket, CheckCircle2, Bot, User,
  FileText, CornerDownLeft, ChevronDown, RefreshCw, Layers
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import API from "../services/api";
import VoiceInput from "./VoiceInput";

function generateChatTitle(query) {
  const cleaned = query.trim().replace(/[^\w\s]/gi, "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  const title = words.slice(0, 5).join(" ");
  return title.charAt(0).toUpperCase() + title.slice(1) || "New Chat";
}

const AGENTS = [
  { value: "study",        label: "Study Agent",        icon: BookOpen, desc: "Academics, research & concepts" },
  { value: "coding",       label: "Coding Agent",       icon: Code2,    desc: "Code generation, debugging & architecture" },
  { value: "productivity", label: "Productivity Agent", icon: Rocket,   desc: "Task planning, workflows & summaries" },
  { value: "divine",       label: "Krishna AI",         icon: Sparkles, desc: "Philosophical clarity & Gita wisdom" },
];

const SUGGESTIONS = {
  study: [
    { title: "Explain Machine Learning", desc: "Break down core concepts with real-world examples" },
    { title: "Quantum Computing Basics", desc: "How qubits and superposition work in simple terms" },
    { title: "System Design Fundamentals", desc: "Load balancers, caching, and database sharding" },
    { title: "Interview Preparation", desc: "Top behavioral and technical interview strategies" },
  ],
  coding: [
    { title: "FastAPI REST Service", desc: "Write an async CRUD endpoint with Pydantic models" },
    { title: "React State Management", desc: "Compare Zustand, Redux Toolkit, and React Context" },
    { title: "Optimize SQL Query", desc: "Index optimization and query plan analysis" },
    { title: "Docker Multi-Stage Build", desc: "Create a minimal production container image" },
  ],
  productivity: [
    { title: "Weekly Execution Plan", desc: "Structure high-priority goals using the Eisenhower Matrix" },
    { title: "Meeting Agenda & Notes", desc: "Draft a concise product sync agenda with action items" },
    { title: "Time Blocking Strategy", desc: "Optimize deep work sessions and minimize context switching" },
    { title: "Sprint Retrospective", desc: "Template for what went well and areas of improvement" },
  ],
  divine: [
    { title: "Overcoming Overthinking", desc: "Finding inner calm when mind is restless" },
    { title: "Fear of Failure & Karma", desc: "Action without anxiety over outcomes (Gita 2.47)" },
    { title: "Maintaining Discipline", desc: "Cultivating steady resolve and mastering the senses" },
    { title: "Finding Purpose in Chaos", desc: "Clarity on duty, dharma, and righteous path" },
  ],
};

function ChatArea({
  theme,
  chats,
  setChats,
  activeChat,
  activeChatId,
  user,
  credits,
  fetchCredits,
  isPro,
  selectedAgent,
  setSelectedAgent,
  isMusicPlaying,
  setIsMusicPlaying,
}) {
  const dark = theme === "dark";
  const outOfCredits = !isPro && credits !== undefined && credits <= 0;

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState("");
  const [copiedMsgIdx, setCopiedMsgIdx] = useState(null);
  const [showAgentPicker, setShowAgentPicker] = useState(false);

  const isDivine = selectedAgent === "divine";
  const currentAgentObj = AGENTS.find((a) => a.value === selectedAgent) || AGENTS[0];

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, loading]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  // Close agent picker on outside click
  useEffect(() => {
    if (!showAgentPicker) return;
    const handler = (e) => {
      if (!e.target.closest("#agent-picker-container")) {
        setShowAgentPicker(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [showAgentPicker]);

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCodeId(id);
      setTimeout(() => setCopiedCodeId(""), 2000);
    } catch (e) {
      console.error("Failed to copy", e);
    }
  };

  const copyMessageText = async (content, idx) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMsgIdx(idx);
      setTimeout(() => setCopiedMsgIdx(null), 2000);
    } catch (e) {
      console.error("Failed to copy message", e);
    }
  };

  const updateActiveChatMessages = useCallback(
    (updater) => {
      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.id !== activeChatId) return chat;
          const currentMessages = chat.messages || [];
          const nextMessages = typeof updater === "function" ? updater(currentMessages) : updater;
          return { ...chat, messages: nextMessages };
        })
      );
    },
    [activeChatId, setChats]
  );

  const uploadFileIfNeeded = async (file) => {
    if (!file) return null;
    const formData = new FormData();
    formData.append("file", file);
    if (user?.email) formData.append("user_email", user.email);
    if (activeChatId) formData.append("chat_id", activeChatId);
    setUploading(true);
    try {
      const response = await API.post("/upload-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      throw new Error(error?.response?.data?.detail || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async (overrideText) => {
    if (loading || uploading || !activeChatId) return;
    const currentInput = (overrideText ?? input ?? "").trim();
    const currentFile = selectedFile;
    const currentImage = imagePreview;
    if (!currentInput && !currentFile && !currentImage) return;

    const isFirstMessage = (activeChat?.messages || []).length === 0;

    const userMessage = {
      role: "user",
      content: currentInput || (currentImage ? "Analyze this image" : `Analyze document: ${currentFile?.name || "File"}`),
      file: currentFile?.name || null,
      image: currentImage || null,
      agent: selectedAgent,
      timestamp: new Date().toISOString(),
    };

    updateActiveChatMessages((messages) => [...messages, userMessage]);

    if (isFirstMessage && currentInput) {
      const newTitle = generateChatTitle(currentInput);
      setChats((prevChats) =>
        prevChats.map((c) => (c.id === activeChatId ? { ...c, title: newTitle } : c))
      );
      API.patch(`/rename-chat/${activeChatId}`, { title: newTitle }).catch(() => {});
    }

    setInput("");
    setSelectedFile(null);
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
    setLoading(true);

    try {
      if (currentImage) {
        const tempMsg = { role: "assistant", content: "", agent: selectedAgent, timestamp: new Date().toISOString() };
        updateActiveChatMessages((messages) => [...messages, tempMsg]);
        const baseURL = import.meta.env.VITE_BACKEND_URL || "https://simha-ai-backend.onrender.com";

        const response = await fetch(`${baseURL}/analyze-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_base64: currentImage,
            prompt: currentInput || "Describe and analyze this image in detail.",
            user_email: user?.email || "",
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.detail || "Image analysis failed.");
        }

        const data = await response.json();
        updateActiveChatMessages((messages) => {
          const updated = [...messages];
          updated[updated.length - 1] = {
            role: "assistant",
            content: data.response || "No response received.",
            agent: selectedAgent,
            timestamp: new Date().toISOString(),
          };
          return updated;
        });
      } else {
        let uploadedDoc = null;
        if (currentFile) {
          try {
            uploadedDoc = await uploadFileIfNeeded(currentFile);
          } catch (uploadError) {
            updateActiveChatMessages((messages) => [
              ...messages,
              { role: "assistant", content: `⚠️ Failed to process file: ${uploadError.message}`, agent: selectedAgent },
            ]);
            setLoading(false);
            return;
          }
        }

        const tempAssistantMessage = {
          role: "assistant",
          content: "",
          agent: selectedAgent,
          timestamp: new Date().toISOString(),
        };
        updateActiveChatMessages((messages) => [...messages, tempAssistantMessage]);

        const baseURL = import.meta.env.VITE_BACKEND_URL || "https://simha-ai-backend.onrender.com";
        const response = await fetch(`${baseURL}/stream-chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: currentInput,
            message: currentInput,
            chat_id: activeChatId,
            user_id: user?.email || "guest",
            agent: selectedAgent,
            doc_context: uploadedDoc ? uploadedDoc.context : null,
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.detail || "Streaming failed.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          updateActiveChatMessages((messages) => {
            const updated = [...messages];
            updated[updated.length - 1] = {
              role: "assistant",
              content: accumulated,
              agent: selectedAgent,
              timestamp: new Date().toISOString(),
            };
            return updated;
          });
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      updateActiveChatMessages((messages) => {
        const updated = [...messages];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.role === "assistant" && !lastMsg.content) {
          updated[updated.length - 1] = {
            role: "assistant",
            content: "⚠️ An error occurred while generating the response. Please check your connection and retry.",
            agent: selectedAgent,
            isError: true,
          };
        }
        return updated;
      });
    } finally {
      setLoading(false);
      if (fetchCredits) fetchCredits();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const currentSuggestions = SUGGESTIONS[selectedAgent] || SUGGESTIONS.study;

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative bg-[#f8fafc] dark:bg-[#09090b]">
      
      {/* ── CONVERSATION STREAM SCROLLABLE AREA ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-3xl mx-auto w-full">

          {/* ── WELCOME / HERO STATE (Empty Chat) ── */}
          {(!activeChat?.messages || activeChat.messages.length === 0) && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="py-10 md:py-16 flex flex-col items-center text-center"
            >
              {/* Brand Emblem */}
              <div className="relative mb-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-300 ${
                  isDivine
                    ? "bg-sky-500/10 border border-sky-500/25 divine-breathing"
                    : "bg-amber-500/10 border border-amber-500/25"
                }`}>
                  {isDivine ? (
                    <span className="text-3xl">🦚</span>
                  ) : (
                    <img src="/logo-lion.png" alt="Simha AI" className="w-9 h-9 object-contain logo-mask" />
                  )}
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
                {isDivine ? "Seek Perspective with Krishna AI" : "How can Simha AI assist you today?"}
              </h1>

              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-md mb-8 leading-relaxed">
                {isDivine
                  ? "Reflect on duty, inner clarity, and purposeful action guided by timeless Bhagavad Gita wisdom."
                  : "Collaborate with dedicated agents for academic research, software engineering, and task orchestration."}
              </p>

              {/* Agent Selector Pills */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 mb-10 p-1 rounded-2xl bg-slate-200/60 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06]">
                {AGENTS.map(({ value, label, icon: Icon }) => {
                  const isSelected = selectedAgent === value;
                  return (
                    <button
                      key={value}
                      onClick={() => setSelectedAgent(value)}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                        isSelected
                          ? value === "divine"
                            ? "bg-sky-500 text-white shadow-sm font-semibold"
                            : "bg-amber-500 text-black shadow-sm font-semibold"
                          : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Icon size={13} strokeWidth={isSelected ? 2.2 : 1.8} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Suggestion Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
                {currentSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(item.title)}
                    className="p-3.5 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-white/[0.06]
                               hover:border-amber-500/40 dark:hover:border-amber-500/30 hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                        {item.title}
                      </span>
                      <CornerDownLeft size={12} className="text-slate-400 opacity-0 group-hover:opacity-100 transition shrink-0 ml-2 mt-0.5" />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-500 leading-normal line-clamp-2">
                      {item.desc}
                    </p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── MESSAGE STREAM ── */}
          {activeChat?.messages?.map((msg, index) => {
            const isUser = msg.role === "user";
            const msgAgent = AGENTS.find((a) => a.value === (msg.agent || selectedAgent)) || AGENTS[0];
            const AgentIcon = msgAgent.icon;

            return (
              <div
                key={index}
                className={`flex flex-col mb-6 ${isUser ? "items-end" : "items-start"}`}
              >
                {/* Message Header Attribution */}
                <div className={`flex items-center gap-2 mb-1.5 px-1 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] ${
                    isUser
                      ? "bg-slate-200 dark:bg-white/[0.1] text-slate-700 dark:text-zinc-300"
                      : isDivine
                      ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  }`}>
                    {isUser ? (
                      <User size={12} />
                    ) : (
                      <AgentIcon size={12} />
                    )}
                  </div>

                  <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    {isUser ? (user?.displayName?.split(" ")[0] || "You") : msgAgent.label}
                  </span>

                  {!isUser && (
                    <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                      Groq Qwen-27B
                    </span>
                  )}
                </div>

                {/* Message Content Container */}
                <div
                  className={`relative group max-w-[95%] sm:max-w-[88%] rounded-2xl transition-all duration-200 ${
                    isUser
                      ? "bg-amber-500/10 dark:bg-amber-500/[0.12] border border-amber-500/20 text-slate-900 dark:text-zinc-100 px-4 py-3 shadow-xs"
                      : "bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-white/[0.06] text-slate-800 dark:text-zinc-200 px-5 py-4 shadow-sm w-full"
                  }`}
                >
                  {/* Attached Image Preview */}
                  {msg.image && (
                    <div className="mb-3 rounded-xl overflow-hidden border border-slate-200 dark:border-white/[0.08] max-w-[280px]">
                      <img src={msg.image} alt="Uploaded attachment" className="w-full object-cover max-h-[220px]" />
                    </div>
                  )}

                  {/* Attached PDF/Doc Chip */}
                  {msg.file && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-3 text-xs font-medium bg-slate-100 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.06]">
                      <FileText size={13} className="text-amber-500" />
                      <span>{msg.file}</span>
                    </div>
                  )}

                  {/* Markdown Renderer for Assistant / User Text */}
                  {isUser ? (
                    <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="markdown-content">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({ children }) => (
                            <div className="markdown-table-wrapper">
                              <table>{children}</table>
                            </div>
                          ),
                          code({ inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || "");
                            const language = match ? match[1] : "";
                            const codeString = String(children).replace(/\n$/, "");
                            const codeId = `code_${index}_${Math.random().toString(36).substring(7)}`;

                            if (!inline && match) {
                              return (
                                <div className="my-3.5 rounded-xl overflow-hidden border border-slate-800/80 bg-[#0d1117] shadow-md">
                                  {/* Code Header Bar */}
                                  <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#161b22] border-b border-slate-800/80 text-[11px] font-mono text-slate-400">
                                    <span>{language}</span>
                                    <button
                                      onClick={() => copyToClipboard(codeString, codeId)}
                                      className="flex items-center gap-1.5 px-2 py-0.5 rounded text-slate-300 hover:text-white hover:bg-white/[0.08] transition"
                                      title="Copy code snippet"
                                    >
                                      {copiedCodeId === codeId ? (
                                        <>
                                          <Check size={12} className="text-emerald-400" />
                                          <span className="text-emerald-400">Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy size={12} />
                                          <span>Copy</span>
                                        </>
                                      )}
                                    </button>
                                  </div>

                                  {/* Code Syntax Highlight */}
                                  <div className="p-3 text-[13px] font-mono leading-relaxed overflow-x-auto">
                                    <SyntaxHighlighter
                                      style={oneDark}
                                      language={language}
                                      PreTag="div"
                                      customStyle={{
                                        margin: 0,
                                        padding: 0,
                                        background: "transparent",
                                        fontSize: "13px",
                                      }}
                                      {...props}
                                    >
                                      {codeString}
                                    </SyntaxHighlighter>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {msg.content || (loading && index === activeChat.messages.length - 1 ? "Thinking..." : "")}
                      </ReactMarkdown>
                    </div>
                  )}

                  {/* Assistant Footer Action Bar (Copy full answer) */}
                  {!isUser && msg.content && (
                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyMessageText(msg.content, index)}
                          className="inline-flex items-center gap-1 hover:text-slate-800 dark:hover:text-zinc-200 transition"
                          title="Copy response"
                        >
                          {copiedMsgIdx === index ? (
                            <>
                              <Check size={12} className="text-emerald-500" />
                              <span className="text-emerald-500 font-medium">Copied response</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy response</span>
                            </>
                          )}
                        </button>
                      </div>

                      <span className="text-[10px] font-mono">
                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* ── LOADING / THINKING INDICATOR ── */}
          {loading && (!activeChat?.messages || activeChat.messages[activeChat.messages.length - 1]?.role !== "assistant") && (
            <div className="flex items-start gap-3 mb-6">
              <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] mt-1 ${
                isDivine ? "bg-sky-500/15 text-sky-500 border border-sky-500/20" : "bg-amber-500/15 text-amber-500 border border-amber-500/20"
              }`}>
                <Sparkles size={12} className="animate-spin" />
              </div>

              <div className="px-4 py-3 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-white/[0.06] shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium ml-1">
                    {currentAgentObj.label} is generating...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* ── FLOATING COMPOSER SECTION ── */}
      <div className="sticky bottom-0 z-20 px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 pt-2 bg-gradient-to-t from-[#f8fafc] via-[#f8fafc]/90 to-transparent dark:from-[#09090b] dark:via-[#09090b]/90 dark:to-transparent">
        <div className="max-w-3xl mx-auto w-full">

          {/* Attachments Preview Bar */}
          {(selectedImage || selectedFile || uploading) && (
            <div className="mb-2 flex items-center gap-2 flex-wrap animate-fade-in">
              {imagePreview && (
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/[0.1] shadow-xs">
                  <img src={imagePreview} alt="Preview" className="w-6 h-6 rounded object-cover" />
                  <span className="text-xs font-medium text-slate-700 dark:text-zinc-300 max-w-[140px] truncate">
                    {selectedImage?.name}
                  </span>
                  <button
                    onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                    className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {selectedFile && (
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/[0.1] shadow-xs">
                  <FileText size={14} className="text-amber-500" />
                  <span className="text-xs font-medium text-slate-700 dark:text-zinc-300 max-w-[140px] truncate">
                    {selectedFile.name}
                  </span>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {uploading && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium">
                  <Sparkles size={12} className="animate-spin" />
                  <span>Processing knowledge vector...</span>
                </div>
              )}
            </div>
          )}

          {/* Composer Box */}
          <div className="relative rounded-2xl bg-white dark:bg-[#121215] border border-slate-200/90 dark:border-white/[0.1] shadow-lg dark:shadow-2xl dark:shadow-black/50 transition-all focus-within:border-amber-500/60 dark:focus-within:border-amber-500/40 focus-within:ring-2 focus-within:ring-amber-500/15">
            
            {/* Input Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                outOfCredits
                  ? "Daily AI credits exhausted. Please upgrade to Pro."
                  : isDivine
                  ? "Share what weighs on your mind with Krishna AI..."
                  : `Message ${currentAgentObj.label}...`
              }
              disabled={outOfCredits}
              rows={1}
              className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none leading-relaxed max-h-40 overflow-y-auto"
            />

            {/* Composer Toolbar */}
            <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
              
              {/* Left Tools */}
              <div className="flex items-center gap-1">
                
                {/* Agent Selector Dropdown */}
                <div className="relative" id="agent-picker-container">
                  <button
                    type="button"
                    onClick={() => setShowAgentPicker(!showAgentPicker)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                      isDivine
                        ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                        : "bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-zinc-300 border border-slate-200/60 dark:border-white/[0.06] hover:bg-slate-200/60 dark:hover:bg-white/[0.1]"
                    }`}
                  >
                    <currentAgentObj.icon size={13} className={isDivine ? "text-sky-500" : "text-amber-500"} />
                    <span className="hidden sm:inline">{currentAgentObj.label}</span>
                    <ChevronDown size={12} className="opacity-60" />
                  </button>

                  <AnimatePresence>
                    {showAgentPicker && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-11 left-0 z-50 w-64 rounded-2xl bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/[0.1] shadow-2xl p-1.5 space-y-0.5"
                      >
                        <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-white/[0.04] mb-1">
                          Select Autonomous Agent
                        </div>
                        {AGENTS.map((agent) => {
                          const isSelected = selectedAgent === agent.value;
                          const IconComp = agent.icon;
                          return (
                            <button
                              key={agent.value}
                              onClick={() => {
                                setSelectedAgent(agent.value);
                                setShowAgentPicker(false);
                              }}
                              className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition ${
                                isSelected
                                  ? "bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold"
                                  : "text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                              }`}
                            >
                              <IconComp size={15} className={`shrink-0 mt-0.5 ${isSelected ? "text-amber-500" : "text-slate-400 dark:text-zinc-500"}`} />
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold">{agent.label}</span>
                                <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal leading-tight">
                                  {agent.desc}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* PDF/Document Upload Button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  hidden
                  accept=".pdf,.txt,.docx,.md"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setSelectedFile(f);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach PDF / Document for RAG knowledge analysis"
                  className="p-1.5 rounded-lg text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
                >
                  <Paperclip size={16} />
                </button>

                {/* Image Upload Button */}
                <input
                  type="file"
                  ref={imageInputRef}
                  hidden
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setSelectedImage(f);
                      const reader = new FileReader();
                      reader.onloadend = () => setImagePreview(reader.result);
                      reader.readAsDataURL(f);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  title="Attach Image for AI Vision analysis"
                  className="p-1.5 rounded-lg text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
                >
                  <ImageIcon size={16} />
                </button>

                {/* Web Speech Voice Input */}
                <VoiceInput
                  theme={theme}
                  disabled={outOfCredits || loading}
                  onTranscript={(transcript) => {
                    setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
                  }}
                />
              </div>

              {/* Right Send Action */}
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={(!input.trim() && !selectedFile && !selectedImage) || loading || outOfCredits}
                className={`p-2 rounded-xl transition-all duration-150 ${
                  (!input.trim() && !selectedFile && !selectedImage) || loading || outOfCredits
                    ? "bg-slate-100 dark:bg-white/[0.05] text-slate-300 dark:text-zinc-600 cursor-not-allowed"
                    : isDivine
                    ? "bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/25 active:scale-95"
                    : "bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/25 active:scale-95"
                }`}
                title="Send message (Enter)"
              >
                {loading ? (
                  <Sparkles size={16} className="animate-spin" />
                ) : (
                  <ArrowUp size={16} strokeWidth={2.5} />
                )}
              </button>
            </div>
          </div>

          <p className="mt-2 text-center text-[10px] text-slate-400 dark:text-zinc-600 tracking-wide">
            Simha AI can make mistakes. Verify critical facts and citations.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ChatArea;
