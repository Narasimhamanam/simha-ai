import {
  MessageSquare, History, FileText, Settings, Plus, Trash2,
  Sparkles, X, Mail, Globe, CalendarDays, LogOut, ChevronRight,
  ShieldCheck, Zap
} from "lucide-react";
import API from "../services/api";

const NAV_ITEMS = [
  { id: "chat",      icon: MessageSquare, label: "AI Workspace" },
  { id: "email",     icon: Mail,          label: "Email Composer" },
  { id: "calendar",  icon: CalendarDays,  label: "AI Scheduler" },
  { id: "url",       icon: Globe,         label: "URL Reader" },
  { id: "documents", icon: FileText,       label: "Documents" },
  { id: "history",   icon: History,       label: "Chat History" },
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
    } catch (error) { 
      console.error("Failed to delete chat:", error); 
    }
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
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const handleNavSelect = (pageId) => {
    setCurrentPage(pageId);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  return (
    <>
      {/* ── MOBILE BACKDROP ── */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${
          isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* ── SIDEBAR PANEL ── */}
      <aside
        className={`
          fixed top-0 left-0
          h-screen h-[100dvh]
          w-[270px]
          flex flex-col shrink-0
          z-50
          transition-transform duration-300 ease-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          bg-white dark:bg-[#0c0c0e]
          border-r border-slate-200/80 dark:border-white/[0.07]
          shadow-xl lg:shadow-none
        `}
      >
        {/* ── BRAND HEADER ── */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200/80 dark:border-white/[0.07] shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              isDivine 
                ? "bg-sky-500/10 border border-sky-500/20 divine-breathing" 
                : "bg-amber-500/10 border border-amber-500/20 shadow-sm"
            }`}>
              {isDivine ? (
                <span className="text-lg">🦚</span>
              ) : (
                <img src="/logo-lion.png" alt="Simha Logo" className="w-5 h-5 object-contain logo-mask" />
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                  {isDivine ? "Krishna AI" : "Simha AI"}
                </span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider ${
                  isDivine
                    ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                }`}>
                  v2.0
                </span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium tracking-wide">
                {isDivine ? "Wisdom & Clarity" : "Autonomous Intelligence"}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── ACTION: NEW CHAT ── */}
        <div className="p-3.5 pb-2">
          <button
            onClick={() => { createNewChat(); if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold
                       bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500
                       text-black shadow-sm shadow-amber-500/20 active:scale-[0.98] transition-all duration-150"
          >
            <span className="flex items-center gap-2">
              <Plus size={15} strokeWidth={2.5} />
              New Workspace
            </span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-black/15 text-black/80">
              ⌘N
            </kbd>
          </button>
        </div>

        {/* ── SCROLLABLE NAVIGATION & RECENT CHATS ── */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-3 space-y-5 py-2">
          
          {/* NAVIGATION ITEMS */}
          <div>
            <div className="px-3 mb-1.5">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-zinc-500">
                Workspace
              </span>
            </div>
            <nav className="space-y-0.5">
              {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
                const isActive = currentPage === id;
                return (
                  <button
                    key={id}
                    onClick={() => handleNavSelect(id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-slate-100 dark:bg-white/[0.08] text-slate-900 dark:text-white font-semibold shadow-xs"
                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100/60 dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        size={15}
                        className={isActive ? (isDivine ? "text-sky-500" : "text-amber-500") : "text-slate-400 dark:text-zinc-500"}
                        strokeWidth={isActive ? 2.2 : 1.8}
                      />
                      <span className="truncate">{label}</span>
                    </div>
                    {isActive && (
                      <div className={`w-1.5 h-1.5 rounded-full ${isDivine ? "bg-sky-500" : "bg-amber-500"}`} />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* RECENT CONVERSATIONS */}
          <div>
            <div className="flex items-center justify-between px-3 mb-1.5">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-zinc-500">
                Recent Chats
              </span>
              <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                {chats.length}
              </span>
            </div>

            <div className="space-y-0.5">
              {chats.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <p className="text-xs text-slate-400 dark:text-zinc-500">No previous conversations</p>
                </div>
              ) : (
                chats.map((chat) => {
                  const isActive = currentPage === "chat" && activeChatId === chat.id;
                  return (
                    <div
                      key={chat.id}
                      onClick={() => handleChatSelect(chat.id)}
                      className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all duration-150 ${
                        isActive
                          ? "bg-slate-100 dark:bg-white/[0.08] text-slate-900 dark:text-white font-medium"
                          : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100/60 dark:hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-1">
                        <MessageSquare
                          size={13}
                          className={`shrink-0 ${isActive ? (isDivine ? "text-sky-500" : "text-amber-500") : "opacity-40"}`}
                        />
                        <span className="truncate">{chat.title || "Untitled Conversation"}</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(chat.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 hover:bg-slate-200/60 dark:hover:bg-white/[0.08] transition"
                        title="Delete chat"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── FOOTER: USER PROFILE & UPGRADE ── */}
        <div className="p-3 border-t border-slate-200/80 dark:border-white/[0.07] shrink-0 bg-slate-50/50 dark:bg-black/20">
          {!isPro && (
            <button
              onClick={handleUpgrade}
              className="w-full mb-3 flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold
                         bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 text-amber-700 dark:text-amber-400 transition"
            >
              <span className="flex items-center gap-1.5">
                <Zap size={14} className="text-amber-500" />
                Upgrade to Pro
              </span>
              <ChevronRight size={14} />
            </button>
          )}

          <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#141417] border border-slate-200/80 dark:border-white/[0.06] shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              {profile?.avatar ? (
                <img
                  src={profile.avatar}
                  alt="avatar"
                  className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-white/[0.1] shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/[0.08] flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    {profile?.nickname?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                </div>
              )}

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold truncate text-slate-800 dark:text-zinc-200">
                    {profile?.nickname?.split(" ")[0] || "User"}
                  </span>
                  {isPro && (
                    <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
                      PRO
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">
                  {profile?.email || "Signed in"}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
