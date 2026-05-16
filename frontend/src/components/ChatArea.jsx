import { useEffect, useRef, useState, useCallback } from "react";
import { Paperclip, Copy, Check, X, ArrowUp, ImageIcon } from "lucide-react";
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

function ChatArea({ theme, chats, setChats, activeChat, activeChatId, user, credits, fetchCredits, isPro }) {
  const dark = theme === "dark";
  const outOfCredits = !isPro && credits !== undefined && credits <= 0;

  const [input, setInput] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("study");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);   // PDF
  const [selectedImage, setSelectedImage] = useState(null); // image file
  const [imagePreview, setImagePreview] = useState(null);   // base64 data URL
  const [uploading, setUploading] = useState(false);
  const [copiedCode, setCopiedCode] = useState("");
  const [showAgentPicker, setShowAgentPicker] = useState(false);

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
    const currentImage = imagePreview; // base64
    const currentImageName = selectedImage?.name || "image";
    if (!currentInput && !currentFile && !currentImage) return;

    const isFirstMessage = (activeChat?.messages || []).length === 0;

    const userMessage = {
      role: "user",
      content: currentInput || (currentImage ? "Analyze this image" : `Analyze this file: ${currentFile?.name || "File"}`),
      file: currentFile?.name || null,
      image: currentImage || null, // base64 shown in chat bubble
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
      // If image is attached, use the vision endpoint
      if (currentImage) {
        const tempMsg = { role: "assistant", content: "" };
        updateActiveChatMessages((messages) => [...messages, tempMsg]);
        const baseURL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
        const res = await fetch(`${baseURL}/analyze-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_base64: currentImage,
            prompt: currentInput || "Describe this image in detail and explain what you see.",
          }),
          signal: AbortSignal.timeout(60000),
        });
        if (!res.ok) throw new Error("Image analysis failed.");
        const data = await res.json();
        const answer = data.response || "Could not analyze image.";
        updateActiveChatMessages((messages) => {
          const msgs = [...messages];
          msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: answer };
          return msgs;
        });
        setLoading(false);
        if (fetchCredits) fetchCredits();
        return;
      }

      let uploadedFileData = null;
      if (currentFile) uploadedFileData = await uploadFileIfNeeded(currentFile);

      const payload = {
        chat_id: activeChatId,
        user_id: user?.email || "guest",
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
      if (fetchCredits) fetchCredits();
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

  // Handle image file selection -> convert to base64
  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── MESSAGES AREA — takes all space above input, scrolls independently ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="max-w-2xl mx-auto w-full px-3 sm:px-4 pt-4">

            {/* Welcome View */}
            {!activeChat?.messages.length && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <div className="w-24 h-24 mb-10 group hover:rotate-12 transition-all duration-700">
                  <img src="/logo-lion.png" alt="Simha AI Logo" className="w-full h-full object-contain logo-mask filter drop-shadow-[0_0_25px_rgba(245,158,11,0.6)]" />
                </div>
                <h2 className={`text-4xl font-black mb-4 tracking-tight text-amber-500`}>
                  How can I guide you?
                </h2>
                <p className={`text-sm max-w-sm mb-12 leading-relaxed font-medium ${dark ? "text-amber-100/40" : "text-amber-900/60"}`}>
                  Protected by Intelligence. Guided by Dharma.<br/>Ask anything to start your journey.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(s)}
                      className={`p-5 text-left rounded-3xl border transition-all duration-500 hover:scale-[1.03] ${
                        dark 
                          ? "bg-white/5 border-amber-500/10 text-amber-100/60 hover:bg-white/10 hover:border-amber-500/30" 
                          : "bg-white border-amber-100 text-amber-900/70 hover:border-amber-400 hover:shadow-2xl shadow-amber-900/5"
                      }`}
                    >
                      <p className="text-[13px] font-bold tracking-wide uppercase opacity-40 mb-1">Knowledge Path</p>
                      <p className="text-sm font-black">{s}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

          <div className="h-4" />
          {/* MESSAGES */}
          {activeChat?.messages?.map((msg, index) => (
            <div
              key={index}
              className={`flex w-full mb-5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {/* Assistant avatar */}
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-600 to-amber-400 flex items-center justify-center flex-shrink-0 mr-2.5 mt-1 overflow-hidden p-1 shadow-lg shadow-amber-500/20">
                  <img src="/logo-lion.png" alt="S" className="w-full h-full object-contain logo-mask scale-125" />
                </div>
              )}

              <div 
                      className={`max-w-[85%] md:max-w-[75%] rounded-[32px] px-6 py-5 shadow-sm text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-amber-600 to-amber-500 text-black font-black ml-4 shadow-xl shadow-amber-900/20 border border-amber-400/30"
                          : dark
                            ? "bg-[#0c0906]/80 backdrop-blur-xl text-amber-50 border border-amber-500/10 mr-4 shadow-2xl shadow-black/40"
                            : "bg-white text-slate-800 border border-amber-100 shadow-xl shadow-amber-900/5 mr-4"
                      }`}
                    >
                {/* Show image if this message has one */}
                {msg.image && (
                  <img
                    src={msg.image}
                    alt="uploaded"
                    className="max-w-[220px] sm:max-w-[280px] rounded-2xl mb-2 object-cover"
                  />
                )}
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
                      <blockquote className={`border-l-4 pl-4 italic my-3 ${dark ? "border-amber-700 text-gray-400" : "border-amber-300 text-gray-600"}`}>
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
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-600 to-amber-400 flex items-center justify-center flex-shrink-0 overflow-hidden p-1 shadow-lg shadow-amber-500/20">
                <img src="/logo-lion.png" alt="S" className="w-full h-full object-contain logo-mask scale-125" />
              </div>
              <div className={`px-4 py-3 rounded-2xl rounded-tl-md flex items-center gap-2 ${dark ? "bg-[#1a1a1a]" : "bg-gray-100"}`}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-amber-500 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="h-4" />
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── INPUT AREA — stacked in flex, never overlaps messages ── */}
      <div className={`shrink-0 px-3 sm:px-4 pb-safe border-t ${
        dark ? "border-gray-900 bg-[#0a0a0a]" : "border-gray-100 bg-white"
      }`}>
        <div className="max-w-2xl mx-auto pt-2 pb-2">

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
                    <Check size={14} className="ml-auto text-amber-500" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Image preview */}
          {imagePreview && (
            <div className="relative inline-block mb-2">
              <img src={imagePreview} alt="preview" className="h-20 rounded-2xl object-cover border border-gray-700" />
              <button
                onClick={clearImage}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center"
              >
                <X size={11} />
              </button>
            </div>
          )}

          {/* PDF file preview */}
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
                placeholder={outOfCredits ? "Daily limit reached. Resets tomorrow." : "Message Simha AI..."}
                disabled={loading || uploading || outOfCredits}
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

                {/* Attach image */}
                <label className={`cursor-pointer p-2 rounded-full transition touch-manipulation ${
                  dark ? "text-gray-500 hover:text-gray-300 hover:bg-white/8" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                }`} title="Upload image">
                  <input
                    ref={imageInputRef}
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={loading || uploading || outOfCredits}
                  />
                  <ImageIcon size={17} className={imagePreview ? "text-amber-500" : ""} />
                </label>

                {/* Attach PDF */}
                <label className={`cursor-pointer p-2 rounded-full transition touch-manipulation ${
                  dark ? "text-gray-500 hover:text-gray-300 hover:bg-white/8" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                }`} title="Upload PDF">
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept=".pdf,.txt,.doc,.docx"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    disabled={loading || uploading || outOfCredits}
                  />
                  <Paperclip size={17} className={selectedFile ? "text-amber-500" : ""} />
                </label>

                {/* Voice */}
                <VoiceInput
                  theme={theme}
                  disabled={loading || uploading || outOfCredits}
                  onTranscript={(text) => setInput((prev) => prev ? prev + " " + text : text)}
                />
              </div>

              {/* Right: Send button */}
              <button
                type="button"
                onClick={() => handleSend(undefined)}
                disabled={loading || uploading || outOfCredits || (!input.trim() && !selectedFile && !imagePreview)}
                className={`p-2.5 rounded-full transition-all touch-manipulation active:scale-95 ${
                  outOfCredits || (!input.trim() && !selectedFile && !imagePreview)
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
