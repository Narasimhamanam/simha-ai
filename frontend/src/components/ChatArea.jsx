import {
  useEffect,
  useRef,
  useState
} from "react";

import {
  Paperclip
} from "lucide-react";

import API from "../services/api";

import ReactMarkdown from "react-markdown";

import remarkGfm from "remark-gfm";

import {
  Prism as SyntaxHighlighter
} from "react-syntax-highlighter";

import {
  atomDark
} from "react-syntax-highlighter/dist/esm/styles/prism";

function ChatArea({

  theme,
  setChats,
  activeChat,
  activeChatId,
  user

}) {

  const dark = theme === "dark";

  const [input, setInput] =
    useState("");

  const [selectedAgent, setSelectedAgent] =
    useState("study");

  const [loading, setLoading] =
    useState(false);

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [uploading, setUploading] =
    useState(false);

  const messagesEndRef =
    useRef(null);

  // AUTO SCROLL

  useEffect(() => {

    messagesEndRef.current?.scrollIntoView({

      behavior: "smooth"

    });

  }, [activeChat, loading]);

  // FILE UPLOAD

  const handleFileUpload =
    async (file) => {

      if (!file) return;

      setSelectedFile(file);

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      try {

        setUploading(true);

        await fetch(

          `${import.meta.env.VITE_BACKEND_URL}/upload-pdf`,

          {

            method: "POST",

            body: formData

          }

        );

        setUploading(false);

      } catch (error) {

        console.log(error);

        setUploading(false);

      }

    };

  // SEND MESSAGE

  const sendMessage = async () => {

    if (!input.trim()) return;

    const formattedInput =

      `${selectedAgent}: ${input}`;

    const userMessage = {

      role: "user",

      content: formattedInput,

      file: selectedFile

        ? selectedFile.name

        : null

    };

    // ADD USER MESSAGE

    setChats((prevChats) =>

      prevChats.map((chat) => {

        if (
          chat.id === activeChatId
        ) {

          return {

            ...chat,

            messages: [

              ...chat.messages,

              userMessage

            ]

          };

        }

        return chat;

      })

    );

    // SAVE USER MESSAGE

    try {

      await API.post(

        "/save-message",

        {

          chat_id:
            activeChatId,

          role: "user",

          content:
            formattedInput

        }

      );

    } catch (error) {

      console.log(error);

    }

    const currentInput =
      formattedInput;

    setInput("");

    setSelectedFile(null);

    setLoading(true);

    try {

      // PDF MODE

      if (selectedFile) {

        const response =
          await fetch(

            `${import.meta.env.VITE_BACKEND_URL}/ask-pdf`,

            {

              method: "POST",

              headers: {

                "Content-Type":
                  "application/json"

              },

              body: JSON.stringify({

                user_id:
                  user.email,

                message:
                  currentInput

              })

            }

          );

        const data =
          await response.json();

        const aiMessage = {

          role: "assistant",

          content:
            data.response

        };

        setChats((prevChats) =>

          prevChats.map((chat) => {

            if (
              chat.id ===
              activeChatId
            ) {

              return {

                ...chat,

                messages: [

                  ...chat.messages,

                  aiMessage

                ]

              };

            }

            return chat;

          })

        );

        await API.post(

          "/save-message",

          {

            chat_id:
              activeChatId,

            role:
              "assistant",

            content:
              data.response

          }

        );

      } else {

        // STREAM MODE

        const response =
          await fetch(

            `${import.meta.env.VITE_BACKEND_URL}/stream-chat`,

            {

              method: "POST",

              headers: {

                "Content-Type":
                  "application/json"

              },

              body: JSON.stringify({

                user_id:
                  user.email,

                message:
                  currentInput

              })

            }

          );

        const reader =
          response.body.getReader();

        const decoder =
          new TextDecoder();

        let streamedText = "";

        while (true) {

          const {

            done,
            value

          } = await reader.read();

          if (done) break;

          streamedText +=

            decoder.decode(value);

          setChats((prevChats) =>

            prevChats.map((chat) => {

              if (
                chat.id ===
                activeChatId
              ) {

                const filteredMessages =

                  chat.messages.filter(

                    (msg) =>

                      !msg.streaming

                  );

                return {

                  ...chat,

                  messages: [

                    ...filteredMessages,

                    {

                      role:
                        "assistant",

                      content:
                        streamedText,

                      streaming:
                        true

                    }

                  ]

                };

              }

              return chat;

            })

          );

        }

        // FINAL MESSAGE

        setChats((prevChats) =>

          prevChats.map((chat) => {

            if (
              chat.id ===
              activeChatId
            ) {

              const filteredMessages =

                chat.messages.filter(

                  (msg) =>

                    !msg.streaming

                );

              return {

                ...chat,

                messages: [

                  ...filteredMessages,

                  {

                    role:
                      "assistant",

                    content:
                      streamedText

                  }

                ]

              };

            }

            return chat;

          })

        );

        await API.post(

          "/save-message",

          {

            chat_id:
              activeChatId,

            role:
              "assistant",

            content:
              streamedText

          }

        );

      }

      setLoading(false);

    } catch (error) {

      console.log(error);

      setLoading(false);

    }

  };

  return (

    <div className="flex-1 flex flex-col overflow-hidden relative">

      {/* CHAT */}

      <div className="flex-1 overflow-y-auto px-10 pt-6 pb-40">

        <div className="space-y-6">

          {/* EMPTY SCREEN */}

          {activeChat?.messages?.length === 0 && (

            <div className="

              flex
              flex-col
              items-center
              justify-center

              min-h-[70vh]

              text-center

            ">

              <h1 className="

                text-6xl
                font-bold

                bg-gradient-to-r
                from-purple-400
                to-pink-500

                bg-clip-text
                text-transparent

                mb-6

              ">

                Simha Multi Agent

              </h1>

              <p className="

                text-gray-400
                text-xl

                max-w-3xl

                leading-9

                mb-10

              ">

                Choose the best AI mode
                based on your task.

              </p>

              <div className="

                grid
                md:grid-cols-3

                gap-6

                w-full
                max-w-5xl

              ">

                {/* STUDY */}

                <div className="

                  p-6

                  rounded-3xl

                  bg-purple-500/10

                  border
                  border-purple-500/20

                ">

                  <h2 className="

                    text-2xl
                    font-bold

                    text-purple-400

                    mb-3

                  ">

                    📚 Study

                  </h2>

                  <p className="

                    text-gray-400

                    leading-7

                  ">

                    Best for aptitude,
                    learning,
                    revision,
                    concepts,
                    interview preparation
                    and explanations.

                  </p>

                </div>

                {/* CODING */}

                <div className="

                  p-6

                  rounded-3xl

                  bg-pink-500/10

                  border
                  border-pink-500/20

                ">

                  <h2 className="

                    text-2xl
                    font-bold

                    text-pink-400

                    mb-3

                  ">

                    💻 Coding

                  </h2>

                  <p className="

                    text-gray-400

                    leading-7

                  ">

                    Best for DSA,
                    debugging,
                    development,
                    AI/ML,
                    projects,
                    and coding help.

                  </p>

                </div>

                {/* PRODUCTIVITY */}

                <div className="

                  p-6

                  rounded-3xl

                  bg-cyan-500/10

                  border
                  border-cyan-500/20

                ">

                  <h2 className="

                    text-2xl
                    font-bold

                    text-cyan-400

                    mb-3

                  ">

                    🚀 Productivity

                  </h2>

                  <p className="

                    text-gray-400

                    leading-7

                  ">

                    Best for planning,
                    roadmaps,
                    productivity,
                    schedules,
                    resumes,
                    and organization.

                  </p>

                </div>

              </div>

            </div>

          )}

          {/* MESSAGES */}

          {activeChat?.messages?.map(

            (msg, index) => (

              <div

                key={index}

                className={`

                  flex

                  ${msg.role === "user"

                    ? "justify-end"

                    : "justify-start"}

                `}
              >

                <div className={`

                  max-w-[75%]

                  px-6
                  py-4

                  rounded-3xl

                  whitespace-pre-wrap

                  overflow-x-auto

                  leading-8

                  ${msg.role === "user"

                    ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white"

                    : dark

                    ? "bg-[#2a2a2a] text-white"

                    : "bg-gray-200 text-black"}

                `}>

                  {/* FILE */}

                  {msg.file && (

                    <div className="

                      mb-4

                      inline-flex
                      items-center
                      gap-2

                      px-3
                      py-2

                      rounded-xl

                      bg-purple-500/20

                      text-sm

                    ">

                      📄 {msg.file}

                    </div>

                  )}

                  {/* MARKDOWN */}

                  <ReactMarkdown

                    remarkPlugins={[remarkGfm]}

                    components={{

                      h1: ({ children }) => (

                        <h1 className="

                          text-4xl
                          font-bold

                          mt-8
                          mb-6

                          text-purple-400

                        ">

                          {children}

                        </h1>

                      ),

                      h2: ({ children }) => (

                        <h2 className="

                          text-3xl
                          font-bold

                          mt-7
                          mb-5

                          text-pink-400

                        ">

                          {children}

                        </h2>

                      ),

                      h3: ({ children }) => (

                        <h3 className="

                          text-2xl
                          font-semibold

                          mt-6
                          mb-4

                          text-cyan-400

                        ">

                          {children}

                        </h3>

                      ),

                      p: ({ children }) => (

                        <p className="

                          leading-8

                          text-[16px]

                          mb-5

                        ">

                          {children}

                        </p>

                      ),

                      strong: ({ children }) => (

                        <strong className="

                          text-purple-300
                          font-bold

                        ">

                          {children}

                        </strong>

                      ),

                      li: ({ children }) => (

                        <li className="

                          ml-6
                          mb-3

                          list-disc

                        ">

                          {children}

                        </li>

                      ),

                      blockquote: ({ children }) => (

                        <blockquote className="

                          border-l-4
                          border-purple-500

                          pl-4
                          italic

                          text-gray-300

                          my-6

                        ">

                          {children}

                        </blockquote>

                      ),

                      code({

                        inline,
                        className,
                        children,
                        ...props

                      }) {

                        const match =

                          /language-(\w+)/.exec(

                            className || ""

                          );

                        return !inline && match ? (

                          <div className="

                            my-6

                            rounded-2xl

                            overflow-hidden

                            border
                            border-purple-500/20

                          ">

                            <SyntaxHighlighter

                              style={atomDark}

                              language={match[1]}

                              PreTag="div"

                              customStyle={{

                                margin: 0,

                                padding: "24px",

                                background:
                                  "#111827",

                                fontSize: "15px",

                                borderRadius:
                                  "1rem"

                              }}

                              {...props}

                            >

                              {String(children).replace(

                                /\n$/,

                                ""

                              )}

                            </SyntaxHighlighter>

                          </div>

                        ) : (

                          <code

                            className="

                              px-2
                              py-1

                              rounded-md

                              bg-black/30

                              text-pink-300

                              text-sm

                            "

                            {...props}

                          >

                            {children}

                          </code>

                        );

                      }

                    }}

                  >

                    {msg.content}

                  </ReactMarkdown>

                </div>

              </div>

            )

          )}

          {/* THINKING */}

          {loading && (

            <div className="flex justify-start">

              <div className={`

                px-6
                py-4

                rounded-3xl

                flex
                items-center
                gap-4

                ${dark

                  ? "bg-[#2a2a2a] text-white"

                  : "bg-gray-200 text-black"}

              `}>

                <div className="flex gap-2">

                  <div className="w-3 h-3 rounded-full bg-purple-500 animate-bounce" />

                  <div

                    className="w-3 h-3 rounded-full bg-pink-500 animate-bounce"

                    style={{

                      animationDelay:
                        "0.2s"

                    }}

                  />

                  <div

                    className="w-3 h-3 rounded-full bg-purple-400 animate-bounce"

                    style={{

                      animationDelay:
                        "0.4s"

                    }}

                  />

                </div>

                <p>

                  Simha AI is thinking...

                </p>

              </div>

            </div>

          )}

          <div ref={messagesEndRef} />

        </div>

      </div>

      {/* INPUT */}

      <div className="absolute bottom-0 left-0 right-0 p-6">

        <div className={`

          max-w-6xl
          mx-auto

          flex
          items-center
          gap-4

          p-4

          rounded-3xl

          border

          backdrop-blur-lg

          ${dark

            ? "bg-[#2a2a2a]/90 border-gray-700"

            : "bg-white/90 border-gray-300"}

        `}>

          {/* AGENT */}

          <select

            value={selectedAgent}

            onChange={(e) =>

              setSelectedAgent(
                e.target.value
              )

            }

            className={`

              px-4
              py-3

              rounded-2xl

              outline-none

              ${dark

                ? "bg-[#3a3a3a] text-white"

                : "bg-gray-100 text-black"}

            `}
          >

            <option value="study">
              Study
            </option>

            <option value="coding">
              Coding
            </option>

            <option value="productivity">
              Productivity
            </option>

          </select>

          {/* INPUT */}

          <input

            type="text"

            value={input}

            onChange={(e) =>

              setInput(
                e.target.value
              )

            }

            onKeyDown={(e) => {

              if (
                e.key === "Enter"
              ) {

                sendMessage();

              }

            }}

            placeholder="Ask anything..."

            className="

              flex-1

              bg-transparent

              outline-none

              text-lg

            "

          />

          {/* FILE */}

          <label className="cursor-pointer">

            <input

              type="file"

              hidden

              onChange={(e) =>

                handleFileUpload(

                  e.target.files[0]

                )

              }

            />

            <Paperclip

              size={22}

              className="

                text-gray-400

                hover:text-purple-500

                transition

              "
            />

          </label>

          {/* SEND */}

          <button

            onClick={sendMessage}

            disabled={uploading}

            className="

              px-7
              py-3

              rounded-2xl

              bg-gradient-to-r
              from-purple-600
              to-pink-500

              hover:opacity-90

              transition

              text-white
              font-semibold

            "
          >

            {uploading

              ? "Uploading..."

              : "Send"}

          </button>

        </div>

      </div>

    </div>

  );

}

export default ChatArea;