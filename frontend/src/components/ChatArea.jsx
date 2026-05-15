import { useEffect, useRef, useState, useCallback } from "react";
import { Paperclip, Copy, Check, X, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import API from "../services/api";

// Generate a short chat title from the user's first query
function generateChatTitle(query) {
  const cleaned = query.trim().replace(/[^\w\s]/gi, "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  const title = words.slice(0, 5).join(" ");
  return title.charAt(0).toUpperCase() + title.slice(1) || "New Chat";
}

const AGENTS = [
  { value: "study", label: "📚 Study", color: "from-blue-500 to-indigo-500" },
  { value: "coding", label: "💻 Coding", color: "from-emerald-500 to-teal-500" },
  { value: "productivity", label: "🚀 Productivity", color: "from-purple-500 to-pink-500" },
];

function ChatArea({ theme, chats, setChats, activeChat, activeChatId, user }) {
  const dark = theme === "dark";

  const [input, setInput] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("study");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [copiedCode, setCopiedCode] = useState("");

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [input]);

  const copyToClipboard = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(""), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const uploadFileIfNeeded = async (file) => {
    if (!file) return null;
    const formData = new FormData();
    formData.append("file", file);
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

  const handleSend = async () => {
    if (loading || uploading || !activeChatId) return;
    const currentInput = (input ?? "").trim();
    const currentFile = selectedFile;
    if (!currentInput && !currentFile) return;

    const isFirstMessage = (activeChat?.messages || []).length === 0;

    const userMessage = {
      role: "user",
      content: currentInput || `Analyze this file: ${currentFile?.name || "File"}`,
      file: currentFile?.name || null,
    };

    updateActiveChatMessages((messages) => [...messages, userMessage]);

    // Auto-rename chat on first message
    if (isFirstMessage && currentInput) {
      const newTitle = generateChatTitle(currentInput);
      setChats((prevChats) =>
        prevChats.map((c) => (c.id === activeChatId ? { ...c, title: newTitle } : c))
      );
      // Persist to backend
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
      const response = await fetch(`${baseURL}/stream-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Stream request failed");

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
        {
          role: "assistant",
          content: error?.message || "Something went wrong. Please try again.",
        },
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative text-sm">
      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 pt-4 sm:pt-6 pb-36">
        <div className="max-w-3xl mx-auto w-full space-y-5">
          {/* EMPTY STATE */}
          {(!activeChat?.messages || activeChat.messages.length === 0) && (
            <div className="min-h-[55vh] flex flex-col items-center justify-center text-center px-2">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-purple-500/20">
                <span className="text-white text-xl sm:text-2xl font-bold">S</span>
              </div>
              <h2 className={`text-xl sm:text-2xl font-semibold mb-2 ${dark ? "text-white" : "text-gray-900"}`}>
                What can I help with?
              </h2>
              <p className={`text-xs sm:text-sm mb-6 sm:mb-10 max-w-xs sm:max-w-md leading-6 ${dark ? "text-gray-400" : "text-gray-500"}`}>
                Select a mode and start chatting.
              </p>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-2xl">
                {AGENTS.map((agent) => (
                  <button
                    key={agent.value}
                    onClick={() => setSelectedAgent(agent.value)}
                    className={`p-3 sm:p-4 rounded-2xl border text-center sm:text-left transition-all duration-200 touch-manipulation ${
                      selectedAgent === agent.value
                        ? `bg-gradient-to-br ${agent.color} border-transparent text-white shadow-lg`
                        : dark
                        ? "bg-[#141414] border-gray-800 text-gray-300 hover:border-gray-600"
                        : "bg-white border-gray-200 text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    <div className="text-lg sm:text-xl mb-1 sm:mb-2">{agent.label.split(" ")[0]}</div>
                    <div className="font-semibold text-[11px] sm:text-sm">{agent.label.split(" ").slice(1).join(" ")}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* MESSAGES */}
          {activeChat?.messages?.map((msg, index) => (
            <div
              key={index}
              className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"} mb-4`}
            >
              {/* Avatar for assistant */}
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center flex-shrink-0 mr-3 mt-0.5">
                  <span className="text-white text-xs font-bold">S</span>
                </div>
              )}

              <div
                className={`max-w-[88%] sm:max-w-[80%] ${
                  msg.role === "user"
                    ? `px-4 py-3 rounded-2xl rounded-tr-sm ${
                        dark ? "bg-[#2a2a2a] text-white" : "bg-[#f0f0f0] text-gray-900"
                      }`
                    : `${dark ? "text-gray-100" : "text-gray-800"}`
                }`}
              >
                {msg.file && (
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg mb-2 text-[11px] ${
                    dark ? "bg-white/10 text-gray-300" : "bg-black/5 text-gray-600"
                  }`}>
                    📄 {msg.file}
                  </div>
                )}

                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => <h1 className="text-xl font-bold mt-5 mb-3">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-base font-semibold mt-4 mb-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-semibold mt-3 mb-1.5">{children}</h3>,
                    p: ({ children }) => <p className="text-[13.5px] leading-7 mb-3">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="text-[13.5px] leading-7">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    blockquote: ({ children }) => (
                      <blockquote className={`border-l-4 pl-4 italic my-4 ${dark ? "border-purple-700 text-gray-400" : "border-purple-400 text-gray-600"}`}>
                        {children}
                      </blockquote>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-4 rounded-xl border border-gray-800">
                        <table className="min-w-full text-sm">{children}</table>
                      </div>
                    ),
                    thead: ({ children }) => <thead className={dark ? "bg-gray-800/60" : "bg-gray-50"}>{children}</thead>,
                    th: ({ children }) => (
                      <th className={`px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide border-b ${dark ? "border-gray-800 text-gray-300" : "border-gray-200 text-gray-600"}`}>
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className={`px-4 py-3 border-b text-[13px] ${dark ? "border-gray-800 text-gray-300" : "border-gray-100 text-gray-700"}`}>
                        {children}
                      </td>
                    ),
                    code({ inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      const codeString = String(children).replace(/\n$/, "");
                      if (!inline && match) {
                        return (
                          <div className="my-4 rounded-xl overflow-hidden border border-gray-800 shadow-lg">
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
                              customStyle={{ margin: 0, padding: "16px", background: "#0d1117", fontSize: "12.5px", lineHeight: "1.7" }}
                              {...props}
                            >
                              {codeString}
                            </SyntaxHighlighter>
                          </div>
                        );
                      }
                      return (
                        <code className={`px-1.5 py-0.5 rounded-md text-[12px] font-mono ${dark ? "bg-gray-800 text-pink-400" : "bg-gray-100 text-pink-600"}`} {...props}>
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

          {/* THINKING INDICATOR */}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">S</span>
              </div>
              <div className={`px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2 ${dark ? "bg-[#1a1a1a]" : "bg-gray-100"}`}>
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                <span className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>
                  {uploading ? "Uploading..." : "Thinking..."}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* INPUT AREA */}
      <div className={`absolute bottom-0 left-0 right-0 px-2 sm:px-4 pb-3 sm:pb-4 pt-2 ${dark ? "bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/95 to-transparent" : "bg-gradient-to-t from-white via-white/95 to-transparent"}`}>
        <div className={`max-w-3xl mx-auto rounded-2xl border shadow-xl transition-all ${
          dark ? "bg-[#141414] border-gray-800 shadow-black/40" : "bg-white border-gray-200 shadow-gray-200/60"
        }`}>
          {/* File preview */}
          {selectedFile && (
            <div className={`flex items-center gap-2 px-4 pt-3 pb-1 text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>
              <span className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${dark ? "bg-white/5" : "bg-gray-100"}`}>
                📄 {selectedFile.name}
              </span>
              <button
                type="button"
                onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className={`p-1 rounded ${dark ? "hover:bg-white/10" : "hover:bg-gray-100"} transition`}
              >
                <X size={12} />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2 px-3 py-3">
            {/* Agent selector */}
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              disabled={loading || uploading}
              className={`shrink-0 px-2.5 py-2 rounded-xl text-xs font-medium outline-none cursor-pointer transition ${
                dark ? "bg-[#1f1f1f] text-gray-300 border border-gray-700 hover:border-gray-600" : "bg-gray-100 text-gray-700 border border-gray-200"
              }`}
            >
              {AGENTS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>

            {/* Text input */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask anything..."
              disabled={loading || uploading}
              style={{ resize: "none", minHeight: "36px", fontSize: "16px" }}
              className={`flex-1 bg-transparent outline-none leading-6 max-h-32 py-1.5 ${
                dark ? "text-white placeholder:text-gray-600" : "text-gray-900 placeholder:text-gray-400"
              }`}
            />

            {/* Attach */}
            <label className="cursor-pointer flex items-center justify-center p-2 rounded-xl transition shrink-0 hover:bg-white/5">
              <input ref={fileInputRef} type="file" hidden accept=".pdf,.txt,.doc,.docx" onChange={handleFileChange} disabled={loading || uploading} />
              <Paperclip size={16} className={selectedFile ? "text-purple-400" : dark ? "text-gray-500" : "text-gray-400"} />
            </label>

            {/* Send button */}
            <button
              type="button"
              onClick={handleSend}
              disabled={loading || uploading || (!input.trim() && !selectedFile)}
              className={`p-2.5 rounded-xl transition shrink-0 touch-manipulation active:scale-95 ${
                !input.trim() && !selectedFile
                  ? dark ? "bg-[#1f1f1f] text-gray-600 cursor-not-allowed" : "bg-gray-100 text-gray-300 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-600 to-pink-500 text-white hover:opacity-90 shadow-lg shadow-purple-500/20"
              }`}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
        <p className={`text-center text-[10px] mt-2 ${dark ? "text-gray-700" : "text-gray-400"}`}>
          Simha AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}

export default ChatArea;
