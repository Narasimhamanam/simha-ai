import { useState } from "react";
import axios from "axios";

function ChatBox() {

  const [message, setMessage] = useState("");

  const [messages, setMessages] = useState([]);

  const [agent, setAgent] = useState("study");

  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {

    if (!message.trim()) return;

    const userMessage = {
      sender: "user",
      text: message
    };

    setMessages((prev) => [...prev, userMessage]);

    setLoading(true);

    try {

      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/chat`,
        {
          user_id: "narasimha",
          message: `${agent}: ${message}`
        }
      );

      const aiMessage = {
        sender: "ai",
        text: response.data.response
      };

      setMessages((prev) => [...prev, aiMessage]);

    } catch (error) {

      console.log(error);

    }

    setLoading(false);

    setMessage("");
  };

  return (
    <div className="flex flex-col flex-1">

      {/* Messages */}

      <div className="flex-1 overflow-y-auto px-6 py-4">

        <div className="max-w-4xl mx-auto">

          {messages.map((msg, index) => (

            <div
              key={index}
              className={`mb-6 flex ${
                msg.sender === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >

              <div
                className={`max-w-[80%] px-5 py-4 rounded-2xl whitespace-pre-wrap
                ${
                  msg.sender === "user"
                    ? "bg-[#2f2f2f]"
                    : "bg-[#444654]"
                }`}
              >
                {msg.text}
              </div>

            </div>

          ))}

          {loading && (

            <div className="text-gray-400">
              Thinking...
            </div>

          )}

        </div>

      </div>

      {/* Input Area */}

      <div className="border-t border-gray-700 p-4">

        <div className="max-w-4xl mx-auto flex gap-3">

          {/* Agent Selector */}

          <select
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            className="bg-[#2f2f2f] px-4 rounded-xl outline-none"
          >
            <option value="study">Study</option>
            <option value="coding">Coding</option>
            <option value="productivity">Productivity</option>
          </select>

          {/* Input */}

          <input
            type="text"
            placeholder="Message Simha Multi Agent..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 bg-[#2f2f2f] px-5 py-4 rounded-xl outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendMessage();
              }
            }}
          />

          {/* Send Button */}

          <button
            onClick={sendMessage}
            className="bg-white text-black px-6 rounded-xl font-semibold hover:bg-gray-300"
          >
            Send
          </button>

        </div>

      </div>

    </div>
  );
}

export default ChatBox;