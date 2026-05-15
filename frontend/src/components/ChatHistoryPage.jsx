function ChatHistoryPage({
  theme,

  chats,

  setActiveChatId,

  setCurrentPage,
}) {
  const dark = theme === "dark";

  return (
    <div
      className="
      flex-1
      overflow-y-auto
      p-10
    "
    >
      <h1
        className="
        text-4xl
        font-bold
        text-purple-500
        mb-10
      "
      >
        Chat History
      </h1>

      <div className="space-y-4">
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => {
              setActiveChatId(chat.id);

              setCurrentPage("chat");
            }}
            className={`
              p-5
              rounded-2xl
              cursor-pointer
              transition

              ${
                dark
                  ? "bg-[#2a2a2a] hover:bg-[#343541]"
                  : "bg-white hover:bg-gray-100"
              }

              shadow-sm
            `}
          >
            <h2
              className="
              text-lg
              font-semibold
              mb-2
            "
            >
              {chat.title}
            </h2>

            <p
              className={`
              text-sm

              ${dark ? "text-gray-400" : "text-gray-600"}
            `}
            >
              {chat.messages.length} messages
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ChatHistoryPage;
