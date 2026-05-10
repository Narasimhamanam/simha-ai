import {

  MessageSquare,
  History,
  FileText,
  Settings,
  Plus,
  Trash2

} from "lucide-react";

import API from "../services/api";

function Sidebar({

  theme,

  chats,
  setChats,

  activeChatId,
  setActiveChatId,

  createNewChat,

  // eslint-disable-next-line no-unused-vars
  currentPage,
  setCurrentPage,

  profile,
  
  handleLogout

}) {

  const dark = theme === "dark";

  // DELETE CHAT

  const deleteChat = async (chatId) => {

    try {

      await API.delete(

        `/delete-chat/${chatId}`

      );

      const updatedChats = chats.filter(

        (chat) => chat.id !== chatId

      );

      setChats(updatedChats);

      if (updatedChats.length > 0) {

        setActiveChatId(updatedChats[0].id);

      }

    } catch (error) {

      console.log(error);

    }

  };

  return (

    <div className={`

      w-[280px]
      h-screen
      border-r

      ${dark

        ? "bg-[#111111] border-gray-800"

        : "bg-white border-gray-200"}

      flex
      flex-col
      justify-between
      p-5

    `}>

      <div>

        <h1 className="

          text-4xl
          font-bold
          text-purple-500
          mb-10

        ">
          Simha Multi Agent ✨
        </h1>

        <button

          onClick={createNewChat}

          className="

            w-full
            bg-gradient-to-r
            from-purple-600
            to-pink-500

            hover:opacity-90

            p-4
            rounded-2xl

            font-semibold

            flex
            items-center
            justify-center
            gap-2

            transition
            mb-8

          "
        >

          <Plus size={20} />

          New Chat

        </button>

        <div className="space-y-5 mb-8">

          <div
            onClick={() =>
              setCurrentPage("history")
            }
            className="

              flex
              items-center
              gap-3

              cursor-pointer hover:opacity-80

            "
          >

            <History size={20} />

            Chat History

          </div>

          <div
            onClick={() =>
              setCurrentPage("chat")
            }
            className="

              flex
              items-center
              gap-3

              cursor-pointer hover:opacity-80

            "
          >

            <MessageSquare size={20} />

            AI Chats

          </div>

          <div
            onClick={() =>
              setCurrentPage("documents")
            }
            className="

              flex
              items-center
              gap-3

              cursor-pointer

            "
          >

            <FileText size={20} />

            Documents

          </div>

          <div
            onClick={() =>
              setCurrentPage("settings")
            }
            className="

              flex
              items-center
              gap-3

              cursor-pointer

            "
          >

            <Settings size={20} />

            Settings

          </div>

        </div>

        <div>

          <p className="

            text-xs
            text-gray-400
            uppercase
            mb-3

          ">
            Recent Chats
          </p>

          <div className="space-y-2">

            {chats.map((chat) => (

              <div

                key={chat.id}

                onClick={() => {

                  setActiveChatId(chat.id);

                  setCurrentPage("chat");

                }}

                className={`

                  p-3
                  rounded-xl

                  cursor-pointer

                  flex
                  items-center
                  justify-between

                  transition

                  ${activeChatId === chat.id

                    ? "bg-purple-600"

                    : dark

                    ? "bg-[#1a1a1a] hover:bg-[#232323]"

                    : "bg-gray-100"}

                `}
              >

                <p className="truncate">

                  {chat.title}

                </p>

                <Trash2

                  size={16}

                  className="text-red-400"

                  onClick={(e) => {

                    e.stopPropagation();

                    deleteChat(chat.id);

                  }}
                />

              </div>

            ))}

          </div>

        </div>

      </div>

      {/* Profile Card */}

      <div className={`

            rounded-2xl
            border

            ${dark

                ? "bg-[#151515] border-gray-800"

                : "bg-white border-gray-200"}

            p-4

            `}>

            <div className="

                flex
                items-center
                gap-3

            ">

                <img

                src={profile?.avatar}

                alt="profile"

                className="

                    w-12
                    h-12

                    rounded-full
                    object-cover

                    border-2
                    border-purple-500

                "
                />

                <div className="flex-1 overflow-hidden">

                <p className="

                    font-semibold
                    truncate

                ">

                    {profile?.nickname}

                </p>

                <p className="

                    text-xs
                    text-gray-400

                    truncate

                ">

                    {profile?.email}

                </p>

                </div>

            </div>

            <button

                onClick={handleLogout}

                className="

                mt-4
                w-full

                py-2.5

                rounded-xl

                bg-gradient-to-r
                from-red-500
                to-pink-500

                hover:opacity-90

                transition

                text-sm
                font-medium

                text-white

                "
            >

                Logout

            </button>

            </div>


        </div>
  );
}

export default Sidebar;