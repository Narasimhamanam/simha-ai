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
  profile, handleLogout, isSidebarOpen, setIsSidebarOpen, isPro,
  selectedAgent, setSelectedAgent
}) {
  const dark = theme === "dark";
  const isDivine = selectedAgent === "divine";

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
        theme: { color: "#f59e0b" },
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
        className={`fixed inset-0 bg-black/80 backdrop-blur-md z-40 md:hidden transition-opacity duration-500 ${
          isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* ── SIDEBAR PANEL ── */}
      <div
        className={`
          fixed top-0 left-0
          h-full h-[100dvh]
          w-[280px] md:w-[260px]
          flex flex-col shrink-0
          z-50
          transition-all duration-500 ease-in-out
          ${isSidebarOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 pointer-events-none"}
          ${dark 
            ? isDivine ? "bg-[#06090c] border-r border-sky-500/10" : "bg-[#080502] border-r border-amber-500/10" 
            : isDivine ? "bg-[#f0f9ff] border-r border-sky-200" : "bg-[#fffbeb] border-r border-amber-200"}
          shadow-2xl
        `}
      >
        <div className="flex items-center justify-between px-5 pt-7 pb-5">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 flex-shrink-0 ${isDivine ? "divine-breathing" : ""}`}>
              {isDivine ? (
                <div className="w-full h-full flex items-center justify-center text-2xl">🦚</div>
              ) : (
                <img src="/logo-lion.png" alt="Logo" className="w-full h-full object-contain logo-mask filter drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
              )}
            </div>
            <div>
              <p className={`text-base font-black leading-none tracking-tight ${dark ? "text-white" : isDivine ? "text-sky-950" : "text-amber-950"}`}>
                {isDivine ? "Krishna AI" : "Simha AI"}
              </p>
              <p className={`text-[9px] uppercase tracking-[0.2em] font-black mt-1 ${isDivine ? "text-sky-500/60" : "text-amber-500/60"}`}>
                {isDivine ? "Wisdom & Peace" : "Dharma & AI"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className={`md:hidden p-2 rounded-xl transition-all ${
              dark 
                ? isDivine ? "text-sky-500/40 hover:text-sky-500 hover:bg-white/5" : "text-amber-500/40 hover:text-amber-500 hover:bg-white/5" 
                : isDivine ? "text-sky-900/40 hover:text-sky-900 hover:bg-sky-100" : "text-amber-900/40 hover:text-amber-900 hover:bg-amber-100"
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── SCROLLABLE CONTENT ── */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-3 space-y-6">
          
          {/* NEW CHAT */}
          <div>
            <button
              onClick={() => { createNewChat(); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[12px] font-black tracking-wide transition-all duration-300 border ${
                dark
                  ? isDivine 
                    ? "bg-sky-500/5 border-sky-500/20 text-sky-500 hover:bg-sky-500/10 shadow-lg shadow-sky-500/5"
                    : "bg-amber-500/5 border-amber-500/20 text-amber-500 hover:bg-amber-500/10 shadow-lg shadow-amber-500/5"
                  : isDivine
                    ? "bg-white border-sky-200 text-sky-700 hover:border-sky-400 shadow-sm"
                    : "bg-white border-amber-200 text-amber-700 hover:border-amber-400 shadow-sm"
              }`}
            >
              <Plus size={16} strokeWidth={3} />
              NEW WORKSPACE
            </button>
          </div>

          {/* ELITE TOOLS */}
          <div>
            <p className={`text-[9px] uppercase tracking-[0.3em] font-black px-3 mb-3 ${isDivine ? "text-sky-500/30" : "text-amber-500/30"}`}>
              Elite Tools
            </p>
            <div className="space-y-0.5">
              {NAV_ITEMS.filter(i => i.id !== "chat").map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => handleNavSelect(id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[12px] font-bold tracking-tight transition-all duration-300 ${
                    currentPage === id
                      ? dark
                        ? isDivine ? "bg-sky-500/10 text-sky-500 shadow-lg border border-sky-500/20" : "bg-amber-500/10 text-amber-500 shadow-lg border border-amber-500/20"
                        : isDivine ? "bg-white text-sky-900 shadow-md border border-sky-200" : "bg-white text-amber-900 shadow-md border border-amber-200"
                      : dark
                      ? isDivine ? "text-sky-100/40 hover:text-sky-100 hover:bg-white/5" : "text-amber-100/40 hover:text-amber-100 hover:bg-white/5"
                      : isDivine ? "text-sky-900/40 hover:text-sky-900 hover:bg-sky-100/50" : "text-amber-900/40 hover:text-amber-900 hover:bg-amber-100/50"
                  }`}
                >
                  <Icon size={15} strokeWidth={currentPage === id ? 3 : 2} className="flex-shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* RECENT PATH */}
          <div>
            <p className={`text-[9px] uppercase tracking-[0.3em] font-black px-3 mb-3 ${isDivine ? "text-sky-500/30" : "text-amber-500/30"}`}>
              Recent Path
            </p>
            <div className="space-y-0.5">
              {chats.length === 0 && (
                <p className={`text-xs px-3 py-6 text-center italic ${dark ? "text-amber-500/20" : "text-amber-900/30"}`}>
                  Journey begins here.
                </p>
              )}
              {chats.map((chat) => {
                const isActive = activeChatId === chat.id;
                return (
                  <div
                    key={chat.id}
                    onClick={() => handleChatSelect(chat.id)}
                    className={`group flex items-center justify-between px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-300 ${
                      isActive
                        ? dark 
                          ? isDivine ? "bg-sky-500/10 text-sky-500 shadow-lg border border-sky-500/20" : "bg-amber-500/10 text-amber-500 shadow-lg border border-amber-500/20" 
                          : isDivine ? "bg-white text-sky-900 shadow-md border border-sky-200" : "bg-white text-amber-900 shadow-md border border-amber-200"
                        : dark 
                          ? isDivine ? "text-sky-100/40 hover:text-sky-100 hover:bg-white/5" : "text-amber-100/40 hover:text-amber-100 hover:bg-white/5" 
                          : isDivine ? "text-sky-900/40 hover:text-sky-900 hover:bg-sky-100/50" : "text-amber-900/40 hover:text-amber-900 hover:bg-amber-100/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <MessageSquare size={13} strokeWidth={isActive ? 3 : 2} className="flex-shrink-0 opacity-60" />
                      <p className="text-[12px] truncate font-bold">{chat.title}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                      className={`flex-shrink-0 p-1.5 rounded-lg transition-all duration-300
                        md:opacity-0 md:group-hover:opacity-100 opacity-40 hover:opacity-100
                        ${dark ? "hover:bg-red-500/20 text-amber-500/40 hover:text-red-400" : "hover:bg-red-50 text-amber-900/30 hover:text-red-500"}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── BOTTOM: PROFILE ── */}
        <div className={`p-4 border-t ${dark ? isDivine ? "border-sky-500/10" : "border-amber-500/10" : isDivine ? "border-sky-200" : "border-amber-200"}`}>
          {!isPro && (
            <button
              onClick={handleUpgrade}
              className="w-full btn-gold-primary py-3 mb-4 rounded-2xl text-[11px] uppercase tracking-[0.2em] font-black shadow-xl"
            >
              UPGRADE TO PRO
            </button>
          )}
          <div className={`flex items-center gap-3 p-3 rounded-2xl ${
            dark 
              ? "bg-white/5 border border-white/5 shadow-2xl" 
              : isDivine 
                ? "bg-white border border-sky-100 shadow-xl shadow-sky-900/5" 
                : "bg-white border border-amber-100 shadow-xl shadow-amber-900/5"
          }`}>
            {profile?.avatar ? (
              <img src={profile.avatar} alt="avatar" className={`w-8 h-8 rounded-xl object-cover ring-2 ${isDivine ? "ring-sky-500/20" : "ring-amber-500/20"} flex-shrink-0`} />
            ) : (
              <div className={`w-8 h-8 flex-shrink-0 ${isDivine ? "divine-breathing" : ""}`}>
                {isDivine ? (
                  <div className="w-full h-full flex items-center justify-center text-xl">🦚</div>
                ) : (
                  <img src="/logo-lion.png" alt="U" className="w-full h-full object-contain logo-mask" />
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-[12px] font-black truncate leading-none ${dark ? "text-white" : isDivine ? "text-sky-950" : "text-amber-950"}`}>
                {profile?.nickname?.split(" ")[0] || "User"}
              </p>
              <p className={`text-[9px] truncate mt-1 font-bold ${dark ? isDivine ? "text-sky-500/40" : "text-amber-500/40" : isDivine ? "text-sky-900/40" : "text-amber-900/40"}`}>
                {profile?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className={`p-2 rounded-lg transition-all duration-300 shrink-0 ${
                dark 
                  ? isDivine ? "text-sky-500/20 hover:text-red-400 hover:bg-red-500/10" : "text-amber-500/20 hover:text-red-400 hover:bg-red-500/10" 
                  : isDivine ? "text-sky-900/20 hover:text-red-500 hover:bg-red-50" : "text-amber-900/20 hover:text-red-500 hover:bg-red-50"
              }`}
            >
              <LogOut size={14} strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Sidebar;
