import { useEffect, useRef, useState, useCallback } from "react";
import { Paperclip, Copy, Check, X, ArrowUp, Mic, MicOff } from "lucide-react";
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
  { value: "study",        label: "📚 Study",        desc: "Academics & Placement" },
  { value: "coding",       label: "💻 Coding",        desc: "Code & Debugging" },
  { value: "productivity", label: "🚀 Productivity",  desc: "Tasks & Planning" },
];

const SUGGESTIONS = [
  "Explain machine learning",
  "Write a Python function",
  "Help me plan my day",
  "Interview prep tips",
];

function ChatArea({ theme, chats, setChats, activeChat, activeChatId, user }) {
  const dark = theme === "dark";

  const [input, setInput] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("study");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [copiedCode, setCopiedCode] = useState("");
  const [showAgentPicker, setShowAgentPicker] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, loading]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [input]);

  // Close agent picker on outside click
  useEffect(() => {
    if (!showAgentPicker) return;
    const handler = (e) => {
      if (!e.target.closest("#agent-picker-root")) setShowAgentPicker(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [showAgentPicker]);

  const copyToClipboard = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(""), 2000);
    } catch {}
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
    if (!currentInput && !currentFile) return;

    const isFirstMessage = (activeChat?.messages || []).length === 0;

    const userMessage = {
      role: "user",
      content: currentInput || `Analyze this file: ${currentFile?.name || "File"}`,
      file: currentFile?.name || null,
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
    if (fileInputRef.current) fileInputRef.current.value = "";
    setLoading(true);

    try {
      let uploadedFileData = null;
      if (currentFile) uploadedFileData = await uploadFileIfNeeded(currentFile);

      const payload = {
        chat_id: activeChatId,
        user_id: user?.uid || user?.id || "guest",
        agent: selectedAgent,
        query: currentInput || `Analyze uploaded file: ${currentFile?.name || "File"}`,
        file_name: currentFile?.name || null,
        ...(uploadedFileData ? { file_data: uploadedFileData } : {}),
      };

      const tempAssistantMsg = { role: "assistant", content: "" };
      updateActiveChatMessages((messages) => [...messages, tempAssistantMsg]);

      const baseURL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

      let response = null;
      let lastError = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          response = await fetch(`${baseURL}/stream-chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(60000),
          });
          if (response.ok) break;
          lastError = new Error(`Server returned ${response.status}`);
        } catch (err) {
          lastError = err;
          if (attempt < 2) {
            setChats((prevChats) =>
              prevChats.map((chat) => {
                if (chat.id !== activeChatId) return chat;
                const msgs = [...(chat.messages || [])];
                if (msgs.length > 0 && msgs[msgs.length - 1].role === "assistant") {
                  msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: "⏳ Server is waking up, please wait..." };
                }
                return { ...chat, messages: msgs };
              })
            );
            await new Promise((r) => setTimeout(r, 5000));
          }
        }
      }

      if (!response || !response.ok) {
        throw lastError || new Error("Failed to connect to the server.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullResponse = "";
      setLoading(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullResponse += decoder.decode(value, { stream: true });
        setChats((prevChats) =>
          prevChats.map((chat) => {
            if (chat.id !== activeChatId) return chat;
            const newMessages = [...(chat.messages || [])];
            if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === "assistant") {
              newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], content: fullResponse };
            }
            return { ...chat, messages: newMessages };
          })
        );
      }
    } catch (error) {
      console.error("Send message failed:", error);
      updateActiveChatMessages((messages) => [
        ...messages,
        { role: "assistant", content: error?.message || "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectedAgentObj = AGENTS.find((a) => a.value === selectedAgent);
  const hasMessages = activeChat?.messages && activeChat.messages.length > 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">

      {/* ── MESSAGES AREA ── */}
      <div className="flex-1 overflow-y-auto scroll-smooth" style={{ paddingBottom: "140px" }}>
        <div className="max-w-2xl mx-auto w-full px-3 sm:px-4 pt-4">

          {/* EMPTY STATE — ChatGPT style */}
          {!hasMessages && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 pt-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center mb-5 shadow-xl shadow-purple-500/20">
                <span className="text-white text-2xl font-bold">S</span>
              </div>
              <h2 className={`text-xl font-semibold mb-1 ${dark ? "text-white" : "text-gray-900"}`}>
                What can I help with?
              </h2>
              <p className={`text-sm mb-8 ${dark ? "text-gray-500" : "text-gray-400"}`}>
                Select a mode, then ask anything
              </p>

              {/* Suggestion chips */}
              <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className={`text-left px-3 py-2.5 rounded-2xl text-xs leading-snug transition-all touch-manipulation ${
                      dark
                        ? "bg-[#1a1a1a] border border-gray-800 text-gray-300 hover:border-gray-600 hover:bg-[#222]"
                        : "bg-gray-50 border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* MESSAGES */}
          {activeChat?.messages?.map((msg, index) => (
            <div
              key={index}
              className={`flex w-full mb-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {/* Assistant avatar */}
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center flex-shrink-0 mr-2.5 mt-1">
                  <span className="text-white text-[11px] font-bold">S</span>
                </div>
              )}

              <div className={`max-w-[86%] sm:max-w-[80%] ${
                msg.role === "user"
                  ? `px-4 py-2.5 rounded-3xl rounded-tr-md text-[14px] leading-relaxed ${
                      dark ? "bg-[#2a2a2a] text-white" : "bg-[#efefef] text-gray-900"
                    }`
                  : `text-[14px] leading-relaxed ${dark ? "text-gray-100" : "text-gray-800"}`
              }`}>
                {msg.file && (
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl mb-2 text-[11px] ${
                    dark ? "bg-white/10 text-gray-300" : "bg-black/5 text-gray-600"
                  }`}>
                    📄 {msg.file}
                  </div>
                )}

                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-base font-semibold mt-3 mb-1.5">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-semibold mt-2.5 mb-1">{children}</h3>,
                    p:  ({ children }) => <p className="text-[14px] leading-7 mb-2.5">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-5 mb-2.5 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 mb-2.5 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="text-[14px] leading-6">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    blockquote: ({ children }) => (
                      <blockquote className={`border-l-4 pl-4 italic my-3 ${dark ? "border-purple-700 text-gray-400" : "border-purple-300 text-gray-600"}`}>
                        {children}
                      </blockquote>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-3 rounded-xl border border-gray-800">
                        <table className="min-w-full text-sm">{children}</table>
                      </div>
                    ),
                    thead: ({ children }) => <thead className={dark ? "bg-gray-800/60" : "bg-gray-50"}>{children}</thead>,
                    th: ({ children }) => (
                      <th className={`px-3 py-2.5 text-left font-semibold text-xs uppercase tracking-wide border-b ${dark ? "border-gray-800 text-gray-300" : "border-gray-200 text-gray-600"}`}>
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className={`px-3 py-2.5 border-b text-[13px] ${dark ? "border-gray-800 text-gray-300" : "border-gray-100 text-gray-700"}`}>
                        {children}
                      </td>
                    ),
                    code({ inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      const codeString = String(children).replace(/\n$/, "");
                      if (!inline && match) {
                        return (
                          <div className="my-3 rounded-xl overflow-hidden border border-gray-800 shadow-lg">
                            <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a2e] border-b border-gray-800">
                              <span className="text-[10px] uppercase text-gray-400 tracking-widest font-mono">{match[1]}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(codeString)}
                                className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-white transition"
                              >
                                {copiedCode === codeString ? (
                                  <><Check size={12} /><span>Copied!</span></>
                                ) : (
                                  <><Copy size={12} /><span>Copy</span></>
                                )}
                              </button>
                            </div>
                            <SyntaxHighlighter
                              language={match[1]}
                              style={oneDark}
                              PreTag="div"
                              wrapLongLines={true}
                              customStyle={{ margin: 0, padding: "14px 16px", background: "#0d1117", fontSize: "12.5px", lineHeight: "1.7" }}
                              {...props}
                            >
                              {codeString}
                            </SyntaxHighlighter>
                          </div>
                        );
                      }
                      return (
                        <code
                          className={`px-1.5 py-0.5 rounded-md text-[12.5px] font-mono ${dark ? "bg-gray-800 text-pink-400" : "bg-gray-100 text-pink-600"}`}
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {msg.content || ""}
                </ReactMarkdown>
              </div>
            </div>
          ))}

          {/* THINKING DOTS */}
          {loading && (
            <div className="flex items-start gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[11px] font-bold">S</span>
              </div>
              <div className={`px-4 py-3 rounded-2xl rounded-tl-md flex items-center gap-2 ${dark ? "bg-[#1a1a1a]" : "bg-gray-100"}`}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-purple-500 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── INPUT AREA — ChatGPT style ── */}
      <div className={`absolute bottom-0 left-0 right-0 px-3 sm:px-4 pb-safe`}>
        <div className={`max-w-2xl mx-auto pb-3`}>

          {/* Agent picker popup */}
          {showAgentPicker && (
            <div
              id="agent-picker-root"
              className={`mb-2 p-1.5 rounded-2xl border shadow-xl ${
                dark ? "bg-[#1a1a1a] border-gray-800 shadow-black/60" : "bg-white border-gray-200 shadow-gray-200"
              }`}
            >
              {AGENTS.map((a) => (
                <button
                  key={a.value}
                  onClick={() => { setSelectedAgent(a.value); setShowAgentPicker(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition touch-manipulation ${
                    selectedAgent === a.value
                      ? dark ? "bg-white/10 text-white" : "bg-gray-100 text-gray-900"
                      : dark ? "text-gray-400 hover:bg-white/6 hover:text-gray-200" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-base">{a.label.split(" ")[0]}</span>
                  <div>
                    <p className="text-sm font-medium leading-none">{a.label.split(" ").slice(1).join(" ")}</p>
                    <p className={`text-[11px] mt-0.5 ${dark ? "text-gray-600" : "text-gray-400"}`}>{a.desc}</p>
                  </div>
                  {selectedAgent === a.value && (
                    <Check size={14} className="ml-auto text-purple-500" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* File preview */}
          {selectedFile && (
            <div className={`flex items-center gap-2 px-3 py-2 mb-1 rounded-xl text-xs ${dark ? "bg-white/6 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
              <span>📄 {selectedFile.name}</span>
              <button
                onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="ml-auto p-0.5 rounded hover:opacity-70 transition"
              >
                <X size={13} />
              </button>
            </div>
          )}

          {/* Main input box */}
          <div className={`flex flex-col rounded-3xl border shadow-lg transition-all ${
            dark
              ? "bg-[#2a2a2a] border-gray-700 shadow-black/40 focus-within:border-gray-600"
              : "bg-white border-gray-300 shadow-gray-100/80 focus-within:border-gray-400"
          }`}>
            {/* Text input */}
            <div className="px-4 pt-3 pb-1">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Message Simha AI..."
                disabled={loading || uploading}
                style={{ resize: "none", minHeight: "28px", fontSize: "16px", lineHeight: "1.6" }}
                className={`w-full bg-transparent outline-none max-h-28 ${
                  dark ? "text-white placeholder:text-gray-600" : "text-gray-900 placeholder:text-gray-400"
                }`}
              />
            </div>

            {/* Bottom toolbar */}
            <div className="flex items-center justify-between px-2 pb-2 gap-1">
              {/* Left: Agent + Attach */}
              <div className="flex items-center gap-1">
                {/* Agent selector button */}
                <button
                  id="agent-picker-root"
                  onClick={() => setShowAgentPicker(!showAgentPicker)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition touch-manipulation ${
                    dark
                      ? "bg-white/8 text-gray-300 hover:bg-white/12"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <span>{selectedAgentObj?.label.split(" ")[0]}</span>
                  <span className="hidden xs:inline">{selectedAgentObj?.label.split(" ").slice(1).join(" ")}</span>
                </button>

                {/* Attach PDF */}
                <label className={`cursor-pointer p-2 rounded-full transition touch-manipulation ${
                  dark ? "text-gray-500 hover:text-gray-300 hover:bg-white/8" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                }`}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept=".pdf,.txt,.doc,.docx"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    disabled={loading || uploading}
                  />
                  <Paperclip size={17} className={selectedFile ? "text-purple-400" : ""} />
                </label>

                {/* Voice */}
                <VoiceInput
                  theme={theme}
                  disabled={loading || uploading}
                  onTranscript={(text) => setInput((prev) => prev ? prev + " " + text : text)}
                />
              </div>

              {/* Right: Send button */}
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={loading || uploading || (!input.trim() && !selectedFile)}
                className={`p-2.5 rounded-full transition-all touch-manipulation active:scale-95 ${
                  !input.trim() && !selectedFile
                    ? dark ? "bg-gray-800 text-gray-600 cursor-not-allowed" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-900 hover:bg-gray-100 shadow-sm"
                }`}
              >
                <ArrowUp size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <p className={`text-center text-[10px] mt-2 px-4 ${dark ? "text-gray-800" : "text-gray-400"}`}>
            Simha AI can make mistakes. Verify important info.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ChatArea;
