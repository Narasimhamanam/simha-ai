// import React, { useEffect, useRef, useState } from "react";
// import { Paperclip, Copy, Check } from "lucide-react";
// import ReactMarkdown from "react-markdown";
// import remarkGfm from "remark-gfm";
// import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
// import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
// import API from "../services/api";

// function ChatArea({
//   theme,
//   setChats,
//   activeChat,
//   activeChatId,
//   user,
// }) {
//   const dark = theme === "dark";

//   const [input, setInput] = useState("");
//   const [selectedAgent, setSelectedAgent] = useState("study");
//   const [loading, setLoading] = useState(false);
//   const [selectedFile, setSelectedFile] = useState(null);
//   const [uploading, setUploading] = useState(false);
//   const [copiedCode, setCopiedCode] = useState("");

//   const messagesEndRef = useRef(null);
//   const fileInputRef = useRef(null);

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({
//       behavior: "smooth",
//     });
//   }, [activeChat, loading]);

//   const copyToClipboard = async (code) => {
//     try {
//       await navigator.clipboard.writeText(code);
//       setCopiedCode(code);
//       setTimeout(() => setCopiedCode(""), 2000);
//     } catch (error) {
//       console.error("Copy failed:", error);
//     }
//   };

//   const updateActiveChatMessages = (updater) => {
//     setChats((prevChats) =>
//       prevChats.map((chat) => {
//         if (chat.id !== activeChatId) return chat;

//         const currentMessages = chat.messages || [];
//         const nextMessages =
//           typeof updater === "function"
//             ? updater(currentMessages)
//             : updater;

//         return {
//           ...chat,
//           messages: nextMessages,
//         };
//       })
//     );
//   };

//   const handleFileChange = (e) => {
//     const file = e.target.files?.[0] || null;
//     setSelectedFile(file);
//   };

//   const uploadFileIfNeeded = async () => {
//     if (!selectedFile) return null;

//     const formData = new FormData();
//     formData.append("file", selectedFile);

//     setUploading(true);
//     try {
//       const response = await API.post("/upload-pdf", formData, {
//         headers: {
//           "Content-Type": "multipart/form-data",
//         },
//       });

//       return response.data;
//     } catch (error) {
//       console.error("File upload failed:", error);
//       throw new Error(
//         error?.response?.data?.detail || "File upload failed"
//       );
//     } finally {
//       setUploading(false);
//     }
//   };

//   const handleSend = async () => {
//     if ((!input.trim() && !selectedFile) || loading || uploading || !activeChatId) {
//       return;
//     }

//     const userMessage = {
//       role: "user",
//       content: input.trim() || `Analyze this file: ${selectedFile?.name}`,
//       file: selectedFile?.name || null,
//     };

//     const currentInput = input.trim();
//     const currentFile = selectedFile;

//     updateActiveChatMessages((messages) => [...messages, userMessage]);

//     setInput("");
//     setSelectedFile(null);
//     if (fileInputRef.current) {
//       fileInputRef.current.value = "";
//     }

//     setLoading(true);

//     try {
//       let uploadedFileData = null;

//       if (currentFile) {
//         uploadedFileData = await uploadFileIfNeeded();
//       }

//       const payload = {
//         chat_id: activeChatId,
//         user_id: user?.id || user?._id || "guest",
//         agent: selectedAgent,
//         query: currentInput || `Analyze the uploaded file: ${currentFile?.name}`,
//         file_name: currentFile?.name || null,
//         ...(uploadedFileData ? { file_data: uploadedFileData } : {}),
//       };

//       const response = await API.post("/chat", payload);

//       const assistantMessage = {
//         role: "assistant",
//         content:
//           response?.data?.response ||
//           response?.data?.answer ||
//           "No response received.",
//       };

//       updateActiveChatMessages((messages) => [...messages, assistantMessage]);
//     } catch (error) {
//       console.error("Send message failed:", error);

//       const errorMessage = {
//         role: "assistant",
//         content:
//           error?.response?.data?.detail ||
//           error?.message ||
//           "Something went wrong while processing your request.",
//       };

//       updateActiveChatMessages((messages) => [...messages, errorMessage]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleKeyDown = (e) => {
//     if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault();
//       handleSend();
//     }
//   };

//   return (
//     <div className="flex-1 flex flex-col overflow-hidden relative text-sm">
//       <div className="flex-1 overflow-y-auto px-4 pt-3 pb-32">
//         <div className="space-y-3">
//           {activeChat?.messages?.length === 0 && (
//             <div className="min-h-[65vh] flex flex-col items-center justify-center text-center">
//               <h1
//                 className={`text-3xl font-bold mb-3 ${
//                   dark ? "text-white" : "text-black"
//                 }`}
//               >
//                 Simha AI
//               </h1>

//               <p
//                 className={`text-sm max-w-xl leading-5 mb-8 ${
//                   dark ? "text-gray-400" : "text-gray-600"
//                 }`}
//               >
//                 Choose the best AI mode based on your task.
//               </p>

//               <div className="grid md:grid-cols-3 gap-4 max-w-4xl w-full">
//                 <div
//                   className={`p-4 rounded-xl border ${
//                     dark
//                       ? "bg-[#171717] border-gray-800"
//                       : "bg-white border-gray-200"
//                   }`}
//                 >
//                   <h2
//                     className={`text-sm font-semibold mb-2 ${
//                       dark ? "text-white" : "text-black"
//                     }`}
//                   >
//                     📚 Study
//                   </h2>
//                   <p
//                     className={`text-[13px] leading-5 ${
//                       dark ? "text-gray-400" : "text-gray-600"
//                     }`}
//                   >
//                     Aptitude, ML, AI, engineering subjects and interview prep.
//                   </p>
//                 </div>

//                 <div
//                   className={`p-4 rounded-xl border ${
//                     dark
//                       ? "bg-[#171717] border-gray-800"
//                       : "bg-white border-gray-200"
//                   }`}
//                 >
//                   <h2
//                     className={`text-sm font-semibold mb-2 ${
//                       dark ? "text-white" : "text-black"
//                     }`}
//                   >
//                     💻 Coding
//                   </h2>
//                   <p
//                     className={`text-[13px] leading-5 ${
//                       dark ? "text-gray-400" : "text-gray-600"
//                     }`}
//                   >
//                     DSA, React, debugging, FastAPI and projects.
//                   </p>
//                 </div>

//                 <div
//                   className={`p-4 rounded-xl border ${
//                     dark
//                       ? "bg-[#171717] border-gray-800"
//                       : "bg-white border-gray-200"
//                   }`}
//                 >
//                   <h2
//                     className={`text-sm font-semibold mb-2 ${
//                       dark ? "text-white" : "text-black"
//                     }`}
//                   >
//                     🚀 Productivity
//                   </h2>
//                   <p
//                     className={`text-[13px] leading-5 ${
//                       dark ? "text-gray-400" : "text-gray-600"
//                     }`}
//                   >
//                     Planning, schedules, roadmaps and career guidance.
//                   </p>
//                 </div>
//               </div>
//             </div>
//           )}

//           {activeChat?.messages?.map((msg, index) => (
//             <div
//               key={index}
//               className={`flex ${
//                 msg.role === "user" ? "justify-end" : "justify-start"
//               }`}
//             >
//               <div
//                 className={`max-w-[620px] w-fit rounded-xl px-3.5 py-2.5 overflow-hidden shadow-sm ${
//                   msg.role === "user"
//                     ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white"
//                     : dark
//                     ? "bg-[#181818] text-white border border-gray-800"
//                     : "bg-white text-black border border-gray-300"
//                 }`}
//               >
//                 {msg.file && (
//                   <div className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-black/10 mb-2 text-[11px]">
//                     📄 {msg.file}
//                   </div>
//                 )}

//                 <ReactMarkdown
//                   remarkPlugins={[remarkGfm]}
//                   components={{
//                     h1: ({ children }) => (
//                       <h1
//                         className={`text-base font-semibold mt-4 mb-2 ${
//                           dark ? "text-white" : "text-black"
//                         }`}
//                       >
//                         {children}
//                       </h1>
//                     ),
//                     h2: ({ children }) => (
//                       <h2
//                         className={`text-[15px] font-semibold mt-4 mb-2 ${
//                           dark ? "text-white" : "text-black"
//                         }`}
//                       >
//                         {children}
//                       </h2>
//                     ),
//                     h3: ({ children }) => (
//                       <h3
//                         className={`text-[14px] font-medium mt-3 mb-2 ${
//                           dark ? "text-white" : "text-black"
//                         }`}
//                       >
//                         {children}
//                       </h3>
//                     ),
//                     p: ({ children }) => (
//                       <p
//                         className={`leading-5 text-[13px] mb-2 font-normal ${
//                           dark ? "text-gray-200" : "text-gray-800"
//                         }`}
//                       >
//                         {children}
//                       </p>
//                     ),
//                     ul: ({ children }) => (
//                       <ul className="mb-2 list-disc pl-4">{children}</ul>
//                     ),
//                     ol: ({ children }) => (
//                       <ol className="mb-2 list-decimal pl-4">{children}</ol>
//                     ),
//                     li: ({ children }) => (
//                       <li
//                         className={`mb-1 leading-5 text-[13px] ${
//                           dark ? "text-gray-200" : "text-gray-800"
//                         }`}
//                       >
//                         {children}
//                       </li>
//                     ),
//                     strong: ({ children }) => (
//                       <strong
//                         className={`font-semibold ${
//                           dark ? "text-white" : "text-black"
//                         }`}
//                       >
//                         {children}
//                       </strong>
//                     ),
//                     blockquote: ({ children }) => (
//                       <blockquote
//                         className={`border-l-2 pl-3 italic my-3 ${
//                           dark
//                             ? "border-gray-700 text-gray-400"
//                             : "border-gray-300 text-gray-600"
//                         }`}
//                       >
//                         {children}
//                       </blockquote>
//                     ),
//                     table: ({ children }) => (
//                       <div className="my-3 overflow-x-auto">
//                         <table
//                           className={`min-w-full border text-[12px] ${
//                             dark ? "border-gray-700" : "border-gray-300"
//                           }`}
//                         >
//                           {children}
//                         </table>
//                       </div>
//                     ),
//                     thead: ({ children }) => (
//                       <thead
//                         className={
//                           dark ? "bg-[#232323]" : "bg-gray-100"
//                         }
//                       >
//                         {children}
//                       </thead>
//                     ),
//                     th: ({ children }) => (
//                       <th
//                         className={`px-3 py-2 border text-left font-semibold ${
//                           dark
//                             ? "border-gray-700 text-white"
//                             : "border-gray-300 text-black"
//                         }`}
//                       >
//                         {children}
//                       </th>
//                     ),
//                     td: ({ children }) => (
//                       <td
//                         className={`px-3 py-2 border align-top ${
//                           dark
//                             ? "border-gray-700 text-gray-200"
//                             : "border-gray-300 text-gray-800"
//                         }`}
//                       >
//                         {children}
//                       </td>
//                     ),
//                     code({ node, inline, className, children, ...props }) {
//                       const match = /language-(\w+)/.exec(className || "");
//                       const codeString = String(children).replace(/\n$/, "");

//                       if (!inline && match) {
//                         return (
//                           <div className="my-3 rounded-lg overflow-hidden border border-gray-800">
//                             <div className="flex items-center justify-between px-3 py-2 bg-[#1e1e1e] border-b border-gray-700">
//                               <span className="text-[10px] uppercase text-gray-400">
//                                 {match[1]}
//                               </span>

//                               <button
//                                 onClick={() => copyToClipboard(codeString)}
//                                 className="flex items-center gap-1 text-[11px] text-gray-300 hover:text-white transition"
//                                 type="button"
//                               >
//                                 {copiedCode === codeString ? (
//                                   <>
//                                     <Check size={12} />
//                                     Copied
//                                   </>
//                                 ) : (
//                                   <>
//                                     <Copy size={12} />
//                                     Copy
//                                   </>
//                                 )}
//                               </button>
//                             </div>

//                             <SyntaxHighlighter
//                               style={oneDark}
//                               language={match[1]}
//                               PreTag="div"
//                               wrapLongLines={true}
//                               customStyle={{
//                                 margin: 0,
//                                 padding: "10px",
//                                 background: "#111827",
//                                 fontSize: "11px",
//                                 lineHeight: "1.5",
//                               }}
//                               {...props}
//                             >
//                               {codeString}
//                             </SyntaxHighlighter>
//                           </div>
//                         );
//                       }

//                       return (
//                         <code
//                           className="px-1.5 py-0.5 rounded bg-black/10 text-pink-400 text-[11px]"
//                           {...props}
//                         >
//                           {children}
//                         </code>
//                       );
//                     },
//                   }}
//                 >
//                   {msg.content || ""}
//                 </ReactMarkdown>
//               </div>
//             </div>
//           ))}

//           {loading && (
//             <div className="flex justify-start">
//               <div
//                 className={`px-3 py-2 rounded-xl flex items-center gap-2 ${
//                   dark
//                     ? "bg-[#181818] text-white"
//                     : "bg-gray-100 text-black"
//                 }`}
//               >
//                 <div className="flex gap-1">
//                   <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" />
//                   <div
//                     className="w-2 h-2 rounded-full bg-pink-500 animate-bounce"
//                     style={{ animationDelay: "0.2s" }}
//                   />
//                   <div
//                     className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"
//                     style={{ animationDelay: "0.4s" }}
//                   />
//                 </div>
//                 <p className="text-[11px]">
//                   {uploading ? "Uploading file..." : "Thinking..."}
//                 </p>
//               </div>
//             </div>
//           )}

//           <div ref={messagesEndRef} />
//         </div>
//       </div>

//       <div className="absolute bottom-0 left-0 right-0 p-4">
//         <div
//           className={`max-w-4xl mx-auto flex items-center gap-2 p-2.5 rounded-xl border ${
//             dark
//               ? "bg-[#181818] border-gray-800"
//               : "bg-white border-gray-300"
//           }`}
//         >
//           <select
//             value={selectedAgent}
//             onChange={(e) => setSelectedAgent(e.target.value)}
//             disabled={loading || uploading}
//             className={`px-2.5 py-2 rounded-lg outline-none text-sm ${
//               dark
//                 ? "bg-[#252525] text-white"
//                 : "bg-gray-100 text-black"
//             }`}
//           >
//             <option value="study">Study</option>
//             <option value="coding">Coding</option>
//             <option value="productivity">Productivity</option>
//           </select>

//           <input
//             type="text"
//             value={input}
//             onChange={(e) => setInput(e.target.value)}
//             onKeyDown={handleKeyDown}
//             placeholder="Ask anything..."
//             disabled={loading || uploading}
//             className={`flex-1 bg-transparent outline-none text-sm ${
//               dark
//                 ? "text-white placeholder:text-gray-500"
//                 : "text-black placeholder:text-gray-400"
//             }`}
//           />

//           <label className="cursor-pointer">
//             <input
//               ref={fileInputRef}
//               type="file"
//               hidden
//               accept=".pdf,.txt,.doc,.docx"
//               onChange={handleFileChange}
//               disabled={loading || uploading}
//             />
//             <Paperclip
//               size={17}
//               className={`transition ${
//                 dark
//                   ? "text-gray-400 hover:text-white"
//                   : "text-gray-500 hover:text-black"
//               }`}
//             />
//           </label>

//           <button
//             onClick={handleSend}
//             disabled={loading || uploading || (!input.trim() && !selectedFile)}
//             className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
//             type="button"
//           >
//             {loading || uploading ? "..." : "Send"}
//           </button>
//         </div>

//         {selectedFile && (
//           <div
//             className={`max-w-4xl mx-auto mt-2 px-2 text-xs ${
//               dark ? "text-gray-400" : "text-gray-600"
//             }`}
//           >
//             Selected file: <span className="font-medium">{selectedFile.name}</span>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// export default ChatArea;



import React, { useEffect, useRef, useState, useCallback } from "react";
import { Paperclip, Copy, Check, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import API from "../services/api";

function ChatArea({
  theme,
  setChats,
  activeChat,
  activeChatId,
  user,
}) {
  const dark = theme === "dark";

  const [input, setInput] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("study");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [copiedCode, setCopiedCode] = useState("");

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [activeChat?.messages, loading]);

  const copyToClipboard = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);

      setTimeout(() => {
        setCopiedCode("");
      }, 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const updateActiveChatMessages = useCallback(
    (updater) => {
      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.id !== activeChatId) {
            return chat;
          }

          const currentMessages = chat.messages || [];

          const nextMessages =
            typeof updater === "function"
              ? updater(currentMessages)
              : updater;

          return {
            ...chat,
            messages: nextMessages,
          };
        })
      );
    },
    [activeChatId, setChats]
  );

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
  };

  // FIXED: now receives file directly instead of using stale state
  const uploadFileIfNeeded = async (file) => {
    if (!file) {
      return null;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);

    try {
      const response = await API.post("/upload-pdf", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return response.data;
    } catch (error) {
      console.error("File upload failed:", error);

      throw new Error(
        error?.response?.data?.detail ||
          "Unable to upload file. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    if (
      loading ||
      uploading ||
      !activeChatId ||
      (!input.trim() && !selectedFile)
    ) {
      return;
    }

    const currentInput = input.trim();
    const currentFile = selectedFile;

    const userMessage = {
      role: "user",
      content:
        currentInput || `Analyze this file: ${currentFile?.name || "File"}`,
      file: currentFile?.name || null,
    };

    updateActiveChatMessages((messages) => [
      ...messages,
      userMessage,
    ]);

    // clear input instantly for smooth UX
    setInput("");
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setLoading(true);

    try {
      let uploadedFileData = null;

      // FIXED: uses currentFile instead of cleared state
      if (currentFile) {
        uploadedFileData = await uploadFileIfNeeded(currentFile);
      }

      const payload = {
        chat_id: activeChatId,
        user_id: user?.id || user?._id || "guest",
        agent: selectedAgent,
        query:
          currentInput ||
          `Analyze uploaded file: ${currentFile?.name || "File"}`,
        file_name: currentFile?.name || null,
        ...(uploadedFileData
          ? {
              file_data: uploadedFileData,
            }
          : {}),
      };

      const response = await API.post("/chat", payload);

      const assistantMessage = {
        role: "assistant",
        content:
          response?.data?.response ||
          response?.data?.answer ||
          response?.data?.message ||
          "No response received.",
      };

      updateActiveChatMessages((messages) => [
        ...messages,
        assistantMessage,
      ]);
    } catch (error) {
      console.error("Send message failed:", error);

      const errorMessage = {
        role: "assistant",
        content:
          error?.response?.data?.detail ||
          error?.message ||
          "Something went wrong while processing your request.",
      };

      updateActiveChatMessages((messages) => [
        ...messages,
        errorMessage,
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative text-sm">
      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-32">
        <div className="space-y-3 max-w-5xl mx-auto w-full">
          {(!activeChat?.messages ||
            activeChat.messages.length === 0) && (
            <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
              <h1
                className={`text-2xl font-semibold mb-3 ${
                  dark ? "text-white" : "text-black"
                }`}
              >
                Simha AI
              </h1>

              <p
                className={`text-sm max-w-lg leading-6 mb-8 ${
                  dark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Choose an AI mode and start chatting.
              </p>

              <div className="grid md:grid-cols-3 gap-3 w-full max-w-3xl">
                {[
                  {
                    title: "📚 Study",
                    desc: "Aptitude, ML, AI and interview preparation.",
                  },
                  {
                    title: "💻 Coding",
                    desc: "React, DSA, FastAPI and debugging support.",
                  },
                  {
                    title: "🚀 Productivity",
                    desc: "Roadmaps, planning and career guidance.",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition-all ${
                      dark
                        ? "bg-[#171717] border-gray-800"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <h2
                      className={`text-sm font-semibold mb-2 ${
                        dark ? "text-white" : "text-black"
                      }`}
                    >
                      {item.title}
                    </h2>

                    <p
                      className={`text-xs leading-5 ${
                        dark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeChat?.messages?.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.role === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`w-fit max-w-[72%] rounded-2xl px-4 py-3 overflow-hidden ${
                  msg.role === "user"
                    ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white"
                    : dark
                    ? "bg-[#181818] border border-gray-800 text-white"
                    : "bg-white border border-gray-200 text-black"
                }`}
              >
                {msg.file && (
                  <div className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-black/10 mb-3 text-[11px]">
                    📄 {msg.file}
                  </div>
                )}

                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-lg font-semibold mt-4 mb-2">
                        {children}
                      </h1>
                    ),

                    h2: ({ children }) => (
                      <h2 className="text-base font-semibold mt-4 mb-2">
                        {children}
                      </h2>
                    ),

                    h3: ({ children }) => (
                      <h3 className="text-sm font-semibold mt-3 mb-2">
                        {children}
                      </h3>
                    ),

                    p: ({ children }) => (
                      <p className="text-[13px] leading-6 mb-3 whitespace-pre-wrap">
                        {children}
                      </p>
                    ),

                    ul: ({ children }) => (
                      <ul className="list-disc pl-5 mb-3 space-y-1">
                        {children}
                      </ul>
                    ),

                    ol: ({ children }) => (
                      <ol className="list-decimal pl-5 mb-3 space-y-1">
                        {children}
                      </ol>
                    ),

                    li: ({ children }) => (
                      <li className="text-[13px] leading-6">{children}</li>
                    ),

                    strong: ({ children }) => (
                      <strong className="font-semibold text-white">
                        {children}
                      </strong>
                    ),

                    blockquote: ({ children }) => (
                      <blockquote
                        className={`border-l-4 pl-4 italic my-4 ${
                          dark
                            ? "border-gray-700 text-gray-400"
                            : "border-gray-300 text-gray-600"
                        }`}
                      >
                        {children}
                      </blockquote>
                    ),

                    table: ({ children }) => (
                      <div className="overflow-x-auto my-4">
                        <table
                          className={`min-w-full text-xs border ${
                            dark
                              ? "border-gray-700"
                              : "border-gray-300"
                          }`}
                        >
                          {children}
                        </table>
                      </div>
                    ),

                    thead: ({ children }) => (
                      <thead
                        className={
                          dark ? "bg-[#232323]" : "bg-gray-100"
                        }
                      >
                        {children}
                      </thead>
                    ),

                    th: ({ children }) => (
                      <th
                        className={`px-3 py-2 text-left border ${
                          dark
                            ? "border-gray-700"
                            : "border-gray-300"
                        }`}
                      >
                        {children}
                      </th>
                    ),

                    td: ({ children }) => (
                      <td
                        className={`px-3 py-2 border ${
                          dark
                            ? "border-gray-700"
                            : "border-gray-300"
                        }`}
                      >
                        {children}
                      </td>
                    ),

                    code({ inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(
                        className || ""
                      );

                      const codeString = String(children).replace(
                        /\n$/,
                        ""
                      );

                      // FIXED: proper code rendering
                      if (!inline && match) {
                        return (
                          <div className="my-4 rounded-xl overflow-hidden border border-gray-800">
                            <div className="flex items-center justify-between px-3 py-2 bg-[#1e1e1e] border-b border-gray-700">
                              <span className="text-[10px] uppercase text-gray-400 tracking-wide">
                                {match[1]}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  copyToClipboard(codeString)
                                }
                                className="flex items-center gap-1 text-[11px] text-gray-300 hover:text-white transition"
                              >
                                {copiedCode === codeString ? (
                                  <>
                                    <Check size={12} />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy size={12} />
                                    Copy
                                  </>
                                )}
                              </button>
                            </div>

                            <SyntaxHighlighter
                              language={match[1]}
                              style={oneDark}
                              PreTag="div"
                              wrapLongLines={true}
                              customStyle={{
                                margin: 0,
                                padding: "14px",
                                background: "#111827",
                                fontSize: "12px",
                                lineHeight: "1.6",
                              }}
                              {...props}
                            >
                              {codeString}
                            </SyntaxHighlighter>
                          </div>
                        );
                      }

                      return (
                        <code
                          className="px-1.5 py-0.5 rounded bg-black/10 text-pink-400 text-[11px]"
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

          {loading && (
            <div className="flex justify-start">
              <div
                className={`px-3 py-2 rounded-xl flex items-center gap-2 ${
                  dark
                    ? "bg-[#181818] text-white"
                    : "bg-gray-100 text-black"
                }`}
              >
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" />

                  <div
                    className="w-2 h-2 rounded-full bg-pink-500 animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />

                  <div
                    className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  />
                </div>

                <p className="text-[11px]">
                  {uploading ? "Uploading file..." : "Thinking..."}
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* INPUT AREA */}
      <div className="absolute bottom-0 left-0 right-0 p-3 backdrop-blur-sm">
        <div
          className={`max-w-5xl mx-auto rounded-2xl border px-3 py-3 ${
            dark
              ? "bg-[#181818] border-gray-800"
              : "bg-white border-gray-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              disabled={loading || uploading}
              className={`px-3 py-2 rounded-xl text-xs outline-none ${
                dark
                  ? "bg-[#252525] text-white"
                  : "bg-gray-100 text-black"
              }`}
            >
              <option value="study">Study</option>
              <option value="coding">Coding</option>
              <option value="productivity">Productivity</option>
            </select>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask anything..."
              disabled={loading || uploading}
              className={`flex-1 bg-transparent outline-none resize-none text-sm max-h-32 ${
                dark
                  ? "text-white placeholder:text-gray-500"
                  : "text-black placeholder:text-gray-400"
              }`}
            />

            <label className="cursor-pointer flex items-center justify-center">
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept=".pdf,.txt,.doc,.docx"
                onChange={handleFileChange}
                disabled={loading || uploading}
              />

              <Paperclip
                size={17}
                className={`transition ${
                  dark
                    ? "text-gray-400 hover:text-white"
                    : "text-gray-500 hover:text-black"
                }`}
              />
            </label>

            <button
              type="button"
              onClick={handleSend}
              disabled={
                loading ||
                uploading ||
                (!input.trim() && !selectedFile)
              }
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading || uploading ? "..." : "Send"}
            </button>
          </div>

          {selectedFile && (
            <div
              className={`mt-3 flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
                dark
                  ? "bg-[#222] text-gray-300"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              <span className="truncate">
                📄 {selectedFile.name}
              </span>

              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);

                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                className="ml-3"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatArea;

