import { useState } from "react";
import axios from "axios";

function ChatBox() {
  const [message, setMessage] =
    useState("");

  const [messages, setMessages] =
    useState([]);

  const [agent, setAgent] =
    useState("study");

  const [loading, setLoading] =
    useState(false);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = {
      sender: "user",
      text: message,
    };

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    setLoading(true);

    try {
      const response =
        await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/streamchat`,
          {
            user_id: "narasimha",
            message: `${agent}: ${message}`,
          }
        );

      const aiMessage = {
        sender: "ai",
        text: response.data.response,
      };

      setMessages((prev) => [
        ...prev,
        aiMessage,
      ]);
    } catch (error) {
      console.log(error);
    }

    setLoading(false);

    setMessage("");
  };

  return (
    <div className="flex flex-col flex-1 text-sm">
      {/* Messages */}

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-4xl mx-auto">
          {messages.map(
            (msg, index) => (
              <div
                key={index}
                className={`mb-4 flex ${
                  msg.sender === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[700px] w-fit px-4 py-3 rounded-xl whitespace-pre-wrap leading-6
                  ${
                    msg.sender === "user"
                      ? "bg-[#2f2f2f]"
                      : "bg-[#1a1a1a] border border-gray-800"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            )
          )}

          {loading && (
            <div className="text-xs text-gray-400">
              Thinking...
            </div>
          )}
        </div>
      </div>

      {/* Input */}

      <div className="border-t border-gray-800 p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <select
            value={agent}
            onChange={(e) =>
              setAgent(e.target.value)
            }
            className="bg-[#1f1f1f] px-3 py-2 rounded-lg outline-none text-sm"
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

          <input
            type="text"
            placeholder="Message Simha AI..."
            value={message}
            onChange={(e) =>
              setMessage(
                e.target.value
              )
            }
            className="flex-1 bg-[#1f1f1f] px-4 py-2 rounded-lg outline-none text-sm"
            onKeyDown={(e) => {
              if (
                e.key === "Enter"
              ) {
                sendMessage();
              }
            }}
          />

          <button
            onClick={sendMessage}
            className="bg-white text-black px-4 rounded-lg text-sm font-medium hover:bg-gray-300"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatBox;