import {
  MessageSquare, History, FileText, Settings, Plus, Trash2,
  Sparkles, X, Mail, Globe, CalendarDays, LogOut
} from "lucide-react";
import API from "../services/api";

const NAV_ITEMS = [
  { id: "chat",      icon: MessageSquare, label: "AI Chats" },
  { id: "email",     icon: Mail,          label: "Email Composer" },
  { id: "calendar",  icon: CalendarDays,  label: "AI Scheduler" },
  { id: "url",       icon: Globe,         label: "URL Summarizer" },
  { id: "history",   icon: History,       label: "History" },
  { id: "documents", icon: FileText,       label: "Documents" },
  { id: "settings",  icon: Settings,      label: "Settings" },
];

function Sidebar({
  theme, chats, setChats, activeChatId, setActiveChatId,
  createNewChat, currentPage, setCurrentPage,
  profile, handleLogout, isSidebarOpen, setIsSidebarOpen, isPro
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

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpgrade = async () => {
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
      alert("Failed to load Razorpay SDK. Please check your internet connection.");
      return;
    }

    try {
      const orderRes = await API.post("/create-razorpay-order", { email: profile?.email });
      const order = orderRes.data;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_dummy",
        amount: order.amount,
        currency: order.currency,
        name: "Simha AI",
        description: "Upgrade to PRO (Unlimited Access)",
        order_id: order.id !== "order_dummy" ? order.id : undefined,
        handler: async function (response) {
          try {
            await API.post("/verify-razorpay-payment", {
              email: profile?.email,
              razorpay_order_id: response.razorpay_order_id || "dummy_order",
              razorpay_payment_id: response.razorpay_payment_id || "dummy_payment",
              razorpay_signature: response.razorpay_signature || "dummy_signature",
            });
            alert("Payment Successful! You are now a PRO user.");
            window.location.reload();
          } catch (e) {
            alert("Payment verification failed.");
          }
        },
        prefill: {
          name: profile?.nickname || "",
          email: profile?.email || "",
        },
        theme: { color: "#a855f7" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        alert("Payment failed: " + response.error.description);
      });
      rzp.open();
    } catch (error) {
      console.error("Upgrade error:", error);
      alert("Failed to initiate upgrade. Please try again later.");
    }
  };

  const handleChatSelect = (chatId) => {
    setActiveChatId(chatId);
    setCurrentPage("chat");
    setIsSidebarOpen(false);
  };

  const handleNavSelect = (pageId) => {
    setCurrentPage(pageId);
    setIsSidebarOpen(false);
  };

  return (
    <>
      {/* ── MOBILE BACKDROP ── */}
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${
          isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* ── SIDEBAR PANEL ── */}
      <div
        className={`
          fixed md:relative top-0 left-0
          h-full h-[100dvh] md:h-screen
          w-[300px] md:w-[260px]
          flex flex-col shrink-0
          z-50
          transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          ${dark ? "bg-[#0c0c0c] border-r border-gray-900" : "bg-[#f9f9f9] border-r border-gray-200"}
        `}
      >
        {/* ── TOP: Logo + Close ── */}
        <div className={`flex items-center justify-between px-4 pt-5 pb-4 border-b ${dark ? "border-gray-900" : "border-gray-200"}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20 flex-shrink-0">
              <Sparkles size={14} className="text-white" />
            </div>
            <div>
              <p className={`text-sm font-bold leading-none ${dark ? "text-white" : "text-gray-900"}`}>Simha AI</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Multi-Agent Assistant</p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className={`md:hidden p-2 rounded-xl transition touch-manipulation ${
              dark ? "text-gray-500 hover:text-white hover:bg-white/8" : "text-gray-400 hover:text-gray-700 hover:bg-gray-200"
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── NEW CHAT BUTTON ── */}
        <div className="px-3 pt-3 pb-1">
          <button
            onClick={() => { createNewChat(); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all touch-manipulation ${
              dark
                ? "bg-white/6 hover:bg-white/10 text-gray-200 border border-white/8"
                : "bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 shadow-sm"
            }`}
          >
            <Plus size={16} />
            New Chat
          </button>
        </div>

        {/* ── NAV LINKS ── */}
        <div className="px-3 pt-2 pb-1">
          <p className={`text-[10px] uppercase tracking-widest font-semibold px-2 mb-1.5 ${dark ? "text-gray-700" : "text-gray-400"}`}>
            Tools
          </p>
          {NAV_ITEMS.filter(i => i.id !== "chat").map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => handleNavSelect(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all mb-0.5 touch-manipulation ${
                currentPage === id
                  ? dark
                    ? "bg-white/10 text-white font-medium"
                    : "bg-gray-200 text-gray-900 font-medium"
                  : dark
                  ? "text-gray-400 hover:text-gray-200 hover:bg-white/6"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              }`}
            >
              <Icon size={16} className="flex-shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className={`mx-3 my-2 border-t ${dark ? "border-gray-900" : "border-gray-200"}`} />

        {/* ── RECENT CHATS ── */}
        <div className="flex-1 overflow-y-auto px-3 pb-2">
          <p className={`text-[10px] uppercase tracking-widest font-semibold px-2 mb-1.5 ${dark ? "text-gray-700" : "text-gray-400"}`}>
            Recent Chats
          </p>
          <div className="space-y-0.5">
            {chats.length === 0 && (
              <p className={`text-xs px-3 py-6 text-center ${dark ? "text-gray-700" : "text-gray-400"}`}>
                No chats yet. Start a new one!
              </p>
            )}
            {chats.map((chat) => {
              const isActive = activeChatId === chat.id;
              return (
                <div
                  key={chat.id}
                  onClick={() => handleChatSelect(chat.id)}
                  className={`group flex items-center justify-between px-3 py-3 rounded-2xl cursor-pointer transition-all duration-300 touch-manipulation ${
                    isActive
                      ? dark ? "bg-white/10 text-white shadow-lg" : "bg-white text-slate-900 shadow-sm border border-slate-100"
                      : dark ? "text-slate-400 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MessageSquare size={13} className="flex-shrink-0 opacity-60" />
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

        {/* ── PROFILE & UPGRADE ── */}
        <div className={`p-4 border-t ${dark ? "border-white/5" : "border-slate-200"}`}>
          {!isPro && (
            <button
              onClick={handleUpgrade}
              className="w-full flex items-center justify-center gap-2 py-3 mb-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-white text-[13px] font-black shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all duration-300 touch-manipulation"
            >
              <span>👑</span> UPGRADE TO PRO
            </button>
          )}
          <div className={`flex items-center gap-3 p-3 rounded-2xl ${dark ? "bg-white/5" : "bg-white border border-slate-100 shadow-sm"}`}>
            {profile?.avatar ? (
              <img src={profile.avatar} alt="avatar" className="w-9 h-9 rounded-full object-cover ring-2 ring-purple-500/30 flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">{profile?.nickname?.charAt(0)?.toUpperCase() || "U"}</span>
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
              className={`p-2 rounded-lg transition shrink-0 touch-manipulation ${
                dark ? "text-gray-600 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"
              }`}
              aria-label="Logout"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Sidebar;
