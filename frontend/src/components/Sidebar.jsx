import { MessageSquare, History, FileText, Settings, Plus, Trash2, Sparkles } from "lucide-react";
import API from "../services/api";

const NAV_ITEMS = [
  { id: "chat", icon: MessageSquare, label: "AI Chats" },
  { id: "history", icon: History, label: "History" },
  { id: "documents", icon: FileText, label: "Documents" },
  { id: "settings", icon: Settings, label: "Settings" },
];

function Sidebar({
  theme, chats, setChats, activeChatId, setActiveChatId,
  createNewChat, currentPage, setCurrentPage,
  profile, handleLogout, isSidebarOpen, setIsSidebarOpen,
}) {
  const dark = theme === "dark";

  const deleteChat = async (chatId) => {
    try {
      await API.delete(`/delete-chat/${chatId}`);
      const updated = chats.filter((c) => c.id !== chatId);
      setChats(updated);
      if (updated.length > 0) setActiveChatId(updated[0].id);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div
        className={`
          w-[260px] h-screen flex flex-col shrink-0 z-50
          fixed md:relative
          transition-transform duration-300
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          ${dark ? "bg-[#0c0c0c] border-r border-gray-900" : "bg-[#f5f5f5] border-r border-gray-200"}
        `}
      >
        {/* LOGO */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles size={14} className="text-white" />
            </div>
            <div>
              <h1 className={`text-sm font-bold leading-none ${dark ? "text-white" : "text-gray-900"}`}>
                Simha AI
              </h1>
              <p className="text-[10px] text-gray-500 mt-0.5">Multi-Agent Assistant</p>
            </div>
          </div>

          {/* NEW CHAT BUTTON */}
          <button
            onClick={createNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:opacity-90 transition-all text-white text-xs font-semibold shadow-lg shadow-purple-500/20"
          >
            <Plus size={15} />
            New Chat
          </button>
        </div>

        {/* NAV */}
        <div className="px-3 mb-2">
          {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setCurrentPage(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all mb-0.5 ${
                currentPage === id
                  ? dark
                    ? "bg-white/8 text-white"
                    : "bg-gray-200 text-gray-900"
                  : dark
                  ? "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* DIVIDER */}
        <div className={`mx-4 mb-2 border-t ${dark ? "border-gray-900" : "border-gray-200"}`} />

        {/* CHAT LIST */}
        <div className="flex-1 overflow-y-auto px-3 pb-2">
          <p className={`text-[9px] uppercase tracking-widest font-semibold px-2 mb-2 ${dark ? "text-gray-600" : "text-gray-400"}`}>
            Recent
          </p>
          <div className="space-y-0.5">
            {chats.length === 0 && (
              <p className={`text-xs px-3 py-4 text-center ${dark ? "text-gray-700" : "text-gray-400"}`}>
                No chats yet
              </p>
            )}
            {chats.map((chat) => {
              const isActive = activeChatId === chat.id;
              return (
                <div
                  key={chat.id}
                  onClick={() => { setActiveChatId(chat.id); setCurrentPage("chat"); setIsSidebarOpen(false); }}
                  className={`group flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all ${
                    isActive
                      ? dark
                        ? "bg-white/8 text-white"
                        : "bg-gray-200 text-gray-900"
                      : dark
                      ? "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/80"
                  }`}
                >
                  {/* Active indicator */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all ${
                      isActive ? "bg-purple-500" : "bg-transparent group-hover:bg-gray-600"
                    }`} />
                    <p className="text-xs truncate max-w-[155px]">{chat.title}</p>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                    className={`flex-shrink-0 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all ${
                      dark ? "hover:bg-red-500/20 text-gray-600 hover:text-red-400" : "hover:bg-red-50 text-gray-400 hover:text-red-500"
                    }`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* PROFILE */}
        <div className={`p-3 border-t ${dark ? "border-gray-900" : "border-gray-200"}`}>
          <div className={`flex items-center gap-3 p-2.5 rounded-xl ${dark ? "bg-white/4 hover:bg-white/6" : "bg-gray-100 hover:bg-gray-200"} transition cursor-pointer`}>
            {profile?.avatar ? (
              <img
                src={profile.avatar}
                alt="avatar"
                className="w-8 h-8 rounded-full object-cover ring-1 ring-purple-500/40"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {profile?.nickname?.charAt(0) || "U"}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold truncate ${dark ? "text-gray-200" : "text-gray-800"}`}>
                {profile?.nickname?.split(" ")[0] || "User"}
              </p>
              <p className={`text-[10px] truncate ${dark ? "text-gray-600" : "text-gray-400"}`}>
                {profile?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className={`text-[10px] px-2 py-1 rounded-lg transition shrink-0 ${
                dark ? "text-gray-600 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"
              }`}
            >
              Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Sidebar;
