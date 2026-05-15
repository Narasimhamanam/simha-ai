import { MessageSquare, History, FileText, Settings, Plus, Trash2, Sparkles, X, Mail } from "lucide-react";
import API from "../services/api";

const NAV_ITEMS = [
  { id: "chat", icon: MessageSquare, label: "AI Chats" },
  { id: "email", icon: Mail, label: "Email Composer" },
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
    } catch (error) { console.log(error); }
  };

  const handleChatSelect = (chatId) => {
    setActiveChatId(chatId);
    setCurrentPage("chat");
    setIsSidebarOpen(false); // always close on mobile after selecting
  };

  const handleNavSelect = (pageId) => {
    setCurrentPage(pageId);
    setIsSidebarOpen(false);
  };

  return (
    <>
      {/* ── MOBILE BACKDROP ── */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${
          isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* ── SIDEBAR PANEL ── */}
      <div
        className={`
          fixed md:relative top-0 left-0
          h-full h-[100dvh] md:h-screen
          w-[280px] md:w-[260px]
          flex flex-col shrink-0
          z-50
          transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          ${dark ? "bg-[#0c0c0c] border-r border-gray-900" : "bg-[#f5f5f5] border-r border-gray-200"}
        `}
      >
        {/* HEADER ROW */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles size={14} className="text-white" />
            </div>
            <div>
              <h1 className={`text-sm font-bold leading-none ${dark ? "text-white" : "text-gray-900"}`}>Simha AI</h1>
              <p className="text-[10px] text-gray-500 mt-0.5">Multi-Agent Assistant</p>
            </div>
          </div>

          {/* Close button — mobile only */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className={`md:hidden p-2 rounded-xl transition touch-manipulation ${dark ? "text-gray-500 hover:text-white hover:bg-white/8" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}
          >
            <X size={18} />
          </button>
        </div>

        {/* NEW CHAT BUTTON */}
        <div className="px-4 pb-3">
          <button
            onClick={createNewChat}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:opacity-90 active:scale-95 transition-all text-white text-xs font-semibold shadow-lg shadow-purple-500/20 touch-manipulation"
          >
            <Plus size={15} />
            New Chat
          </button>
        </div>

        {/* NAV LINKS */}
        <div className="px-3 mb-1">
          {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => handleNavSelect(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all mb-0.5 touch-manipulation ${
                currentPage === id
                  ? dark ? "bg-white/8 text-white" : "bg-gray-200 text-gray-900"
                  : dark ? "text-gray-500 hover:text-gray-300 hover:bg-white/5 active:bg-white/8" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
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
              <p className={`text-xs px-3 py-6 text-center ${dark ? "text-gray-700" : "text-gray-400"}`}>
                No chats yet
              </p>
            )}
            {chats.map((chat) => {
              const isActive = activeChatId === chat.id;
              return (
                <div
                  key={chat.id}
                  onClick={() => handleChatSelect(chat.id)}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all touch-manipulation ${
                    isActive
                      ? dark ? "bg-white/8 text-white" : "bg-gray-200 text-gray-900"
                      : dark ? "text-gray-500 hover:text-gray-300 hover:bg-white/5 active:bg-white/8" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all ${
                      isActive ? "bg-purple-500" : "bg-transparent group-hover:bg-gray-600"
                    }`} />
                    <p className="text-xs truncate">{chat.title}</p>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                    className={`flex-shrink-0 p-1.5 rounded-lg transition-all touch-manipulation
                      md:opacity-0 md:group-hover:opacity-100 opacity-30 hover:opacity-100
                      ${dark ? "hover:bg-red-500/20 text-gray-500 hover:text-red-400" : "hover:bg-red-50 text-gray-400 hover:text-red-500"}`}
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
          <div className={`flex items-center gap-3 p-2.5 rounded-xl transition ${dark ? "bg-white/4" : "bg-gray-100"}`}>
            {profile?.avatar ? (
              <img src={profile.avatar} alt="avatar" className="w-9 h-9 rounded-full object-cover ring-1 ring-purple-500/40 flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">{profile?.nickname?.charAt(0) || "U"}</span>
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
              className={`text-[10px] px-2.5 py-1.5 rounded-lg transition shrink-0 touch-manipulation ${
                dark ? "text-gray-600 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"
              }`}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Sidebar;
