import {
  MessageSquare,
  History,
  FileText,
  Settings,
  Plus,
  Trash2,
} from "lucide-react";

import API from "../services/api";

function Sidebar({
  theme,
  chats,
  setChats,
  activeChatId,
  setActiveChatId,
  createNewChat,
  currentPage,
  setCurrentPage,
  profile,
  handleLogout,
  isSidebarOpen,
  setIsSidebarOpen,
}) {
  const dark = theme === "dark";

  // DELETE CHAT

  const deleteChat = async (chatId) => {
    try {
      await API.delete(`/delete-chat/${chatId}`);

      const updatedChats = chats.filter((chat) => chat.id !== chatId);

      setChats(updatedChats);

      if (updatedChats.length > 0) {
        setActiveChatId(updatedChats[0].id);
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div
      className={`
        w-[260px] h-screen border-r flex flex-col shrink-0 transition-transform duration-300 z-50 
        ${dark ? "bg-[#0a0a0a] border-gray-800 text-white" : "bg-[#f9f9f9] border-gray-200 text-black"}
        fixed md:relative
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}
    >
      {/* TOP */}

      <div className="p-4">
        {/* LOGO */}

        <h1
          className="

            text-xl
            font-bold

            leading-snug

            text-white

            mb-6

          "
        >
          Simha Multi Agent
        </h1>

        {/* NEW CHAT */}

        <button
          onClick={createNewChat}
          className="

            w-full

            flex
            items-center
            justify-center
            gap-2

            py-2.5

            rounded-xl

            bg-gradient-to-r
            from-purple-600
            to-pink-500

            hover:opacity-90

            transition

            text-white
            text-sm
            font-medium

            mb-6

          "
        >
          <Plus size={18} />
          New Chat
        </button>

        {/* NAVIGATION */}

        <div className="space-y-1.5">
          {/* HISTORY */}

          <div
            onClick={() => setCurrentPage("history")}
            className={`

              flex
              items-center
              gap-2.5

              px-3
              py-2

              rounded-lg

              cursor-pointer

              transition-all

              text-sm

              ${
                currentPage === "history"
                  ? dark
                    ? "bg-[#181818]"
                    : "bg-gray-100"
                  : dark
                    ? "hover:bg-[#151515]"
                    : "hover:bg-gray-100"
              }

            `}
          >
            <History size={16} />

            <span>Chat History</span>
          </div>

          {/* AI CHATS */}

          <div
            onClick={() => setCurrentPage("chat")}
            className={`

              flex
              items-center
              gap-2.5

              px-3
              py-2

              rounded-lg

              cursor-pointer

              transition-all

              text-sm

              ${
                currentPage === "chat"
                  ? dark
                    ? "bg-[#181818]"
                    : "bg-gray-100"
                  : dark
                    ? "hover:bg-[#151515]"
                    : "hover:bg-gray-100"
              }

            `}
          >
            <MessageSquare size={16} />

            <span>AI Chats</span>
          </div>

          {/* DOCUMENTS */}

          <div
            onClick={() => setCurrentPage("documents")}
            className={`

              flex
              items-center
              gap-2.5

              px-3
              py-2

              rounded-lg

              cursor-pointer

              transition-all

              text-sm

              ${
                currentPage === "documents"
                  ? dark
                    ? "bg-[#181818]"
                    : "bg-gray-100"
                  : dark
                    ? "hover:bg-[#151515]"
                    : "hover:bg-gray-100"
              }

            `}
          >
            <FileText size={16} />

            <span>Documents</span>
          </div>

          {/* SETTINGS */}

          <div
            onClick={() => setCurrentPage("settings")}
            className={`

              flex
              items-center
              gap-2.5

              px-3
              py-2

              rounded-lg

              cursor-pointer

              transition-all

              text-sm

              ${
                currentPage === "settings"
                  ? dark
                    ? "bg-[#181818]"
                    : "bg-gray-100"
                  : dark
                    ? "hover:bg-[#151515]"
                    : "hover:bg-gray-100"
              }

            `}
          >
            <Settings size={16} />

            <span>Settings</span>
          </div>
        </div>
      </div>

      {/* CHATS */}

      <div
        className="

          flex-1

          overflow-y-auto

          px-3

          scrollbar-thin
          scrollbar-thumb-gray-700

        "
      >
        <p
          className="

            text-[10px]
            uppercase

            text-gray-500

            tracking-wider

            mb-2

          "
        >
          Recent Chats
        </p>

        <div className="space-y-1.5 pb-4">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => {
                setActiveChatId(chat.id);
                setCurrentPage("chat");
              }}
              className={`

                flex
                items-center
                justify-between

                px-3
                py-2

                rounded-lg

                cursor-pointer

                transition-all

                group

                ${
                  activeChatId === chat.id
                    ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white"
                    : dark
                      ? "bg-[#121212] hover:bg-[#1a1a1a]"
                      : "bg-gray-100 hover:bg-gray-200"
                }

              `}
            >
              <p
                className="

                  text-sm

                  truncate

                  max-w-[130px]

                "
              >
                {chat.title}
              </p>

              <Trash2
                size={14}
                className="

                  text-red-400

                  opacity-70

                  hover:opacity-100

                  transition

                  flex-shrink-0

                "
                onClick={(e) => {
                  e.stopPropagation();

                  deleteChat(chat.id);
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* PROFILE */}

      <div
        className="

          p-3

          border-t

          border-gray-800

        "
      >
        <div
          className={`

            ${dark ? "bg-[#111111]" : "bg-gray-100"}

            border

            ${dark ? "border-gray-800" : "border-gray-200"}

            rounded-xl

            p-3

          `}
        >
          <div
            className="

              flex
              items-center

              gap-3

              mb-3

            "
          >
            <img
              src={profile?.avatar}
              alt="profile"
              className="

                w-10
                h-10

                rounded-full

                object-cover

                border
                border-purple-500

              "
            />

            <div className="overflow-hidden">
              <h3
                className="

                  text-sm
                  font-semibold

                  truncate

                "
              >
                {profile?.nickname}
              </h3>

              <p
                className="

                  text-[11px]
                  text-gray-400

                  truncate

                  max-w-[140px]

                "
              >
                {profile?.email}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="

              w-full

              py-2

              rounded-lg

              bg-gradient-to-r
              from-red-500
              to-pink-500

              hover:opacity-90

              transition

              text-white
              text-sm
              font-medium

            "
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
