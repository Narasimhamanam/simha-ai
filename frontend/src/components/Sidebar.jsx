import {
  MessageSquare, History, FileText, Settings, Plus, Trash2,
  X, Mail, Globe, CalendarDays, LogOut, ChevronRight, Zap, Layers
} from "lucide-react";
import { useState } from "react";
import API from "../services/api";

const NAV_ITEMS = [
  { id: "chat",      icon: MessageSquare, label: "AI Workspace" },
  { id: "email",     icon: Mail,          label: "Email Composer" },
  { id: "calendar",  icon: CalendarDays,  label: "AI Scheduler" },
  { id: "url",       icon: Globe,         label: "URL Reader" },
  { id: "documents", icon: FileText,      label: "Documents" },
  { id: "history",   icon: History,       label: "Chat History" },
  { id: "settings",  icon: Settings,      label: "Settings" },
];

function Sidebar({
  theme, chats, setChats, activeChatId, setActiveChatId,
  createNewChat, currentPage, setCurrentPage,
  profile, handleLogout, isSidebarOpen, setIsSidebarOpen, isPro,
  selectedAgent, setSelectedAgent,
}) {
  const isDivine = selectedAgent === "divine";
  const [hovered, setHovered] = useState(false);
  const expanded = isSidebarOpen || hovered;

  const deleteChat = async (chatId) => {
    try {
      await API.delete(`/delete-chat/${chatId}`);
      const updated = chats.filter((c) => c.id !== chatId);
      setChats(updated);
      if (updated.length > 0) setActiveChatId(updated[0].id);
    } catch (e) { console.error("Delete failed:", e); }
  };

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  const handleUpgrade = async () => {
    const ok = await loadRazorpayScript();
    if (!ok) { alert("Failed to load Razorpay."); return; }
    try {
      const orderRes = await API.post("/create-razorpay-order", { email: profile?.email });
      const order = orderRes.data;
      const opts = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_dummy",
        amount: order.amount, currency: order.currency,
        name: "Simha AI", description: "Upgrade to PRO",
        order_id: order.id !== "order_dummy" ? order.id : undefined,
        handler: async (res) => {
          try {
            await API.post("/verify-razorpay-payment", {
              email: profile?.email,
              razorpay_order_id: res.razorpay_order_id || "dummy",
              razorpay_payment_id: res.razorpay_payment_id || "dummy",
              razorpay_signature: res.razorpay_signature || "dummy",
            });
            alert("You are now a PRO user!"); window.location.reload();
          } catch { alert("Payment verification failed."); }
        },
        prefill: { name: profile?.nickname || "", email: profile?.email || "" },
        theme: { color: "#D6A84F" },
      };
      const rzp = new window.Razorpay(opts);
      rzp.on("payment.failed", (r) => alert("Payment failed: " + r.error.description));
      rzp.open();
    } catch (e) { console.error("Upgrade error:", e); alert("Failed to initiate upgrade."); }
  };

  const navTo = (id) => { setCurrentPage(id); if (window.innerWidth < 1024) setIsSidebarOpen(false); };
  const selectChat = (id) => { setActiveChatId(id); setCurrentPage("chat"); if (window.innerWidth < 1024) setIsSidebarOpen(false); };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${
          isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Rail / Drawer */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`
          fixed top-0 left-0 h-[100dvh] z-50 flex flex-col shrink-0
          transition-all duration-300 ease-out
          ${expanded ? "w-[260px]" : "w-[64px]"}
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          bg-void-surface/90 backdrop-blur-xl
          border-r border-[rgba(255,255,255,0.06)]
        `}
        style={{ willChange: "width" }}
      >
        {/* Brand */}
        <div className={`flex items-center h-14 border-b border-[rgba(255,255,255,0.06)] shrink-0 ${expanded ? "px-4 gap-3" : "justify-center px-0"}`}>
          <div className="w-8 h-8 rounded-xl bg-[rgba(214,168,79,0.12)] border border-[rgba(214,168,79,0.25)] flex items-center justify-center shrink-0">
            <img src="/logo-lion.png" alt="Simha" className="w-5 h-5 object-contain logo-mask" />
          </div>
          {expanded && (
            <div className="flex flex-col min-w-0 animate-fade-in">
              <span className="text-sm font-bold text-[var(--ink-1)] tracking-tight truncate">Simha AI</span>
              <span className="text-[10px] text-[var(--ink-3)]">Zero-G Sanctum</span>
            </div>
          )}
          {expanded && (
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden ml-auto p-1 rounded text-[var(--ink-3)] hover:text-[var(--ink-1)]">
              <X size={15} />
            </button>
          )}
        </div>

        {/* New Chat */}
        <div className={`${expanded ? "p-3" : "p-2"}`}>
          <button
            onClick={() => { createNewChat(); if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
            className={`btn-gold w-full flex items-center justify-center gap-2 ${expanded ? "" : "!px-0"}`}
          >
            <Plus size={15} strokeWidth={2.5} />
            {expanded && <span>New Workspace</span>}
          </button>
        </div>

        {/* Nav + Chats */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-2 py-1 space-y-4">
          {/* Navigation */}
          <nav className="space-y-0.5">
            {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
              const active = currentPage === id;
              return (
                <button
                  key={id}
                  onClick={() => navTo(id)}
                  title={!expanded ? label : undefined}
                  className={`w-full flex items-center rounded-xl transition-all duration-150 ${
                    expanded ? "px-3 py-2 gap-2.5" : "px-0 py-2 justify-center"
                  } text-xs font-medium ${
                    active
                      ? "glass-panel !rounded-xl text-[var(--ink-1)] font-bold"
                      : "text-[var(--ink-3)] hover:text-[var(--ink-1)] hover:bg-[rgba(255,255,255,0.04)]"
                  }`}
                >
                  <Icon size={16} className={active ? "text-[var(--mane-gold)]" : ""} strokeWidth={active ? 2.2 : 1.7} />
                  {expanded && <span className="truncate">{label}</span>}
                  {active && expanded && <div className="w-1.5 h-1.5 rounded-full bg-[var(--mane-gold)] ml-auto" />}
                </button>
              );
            })}
          </nav>

          {/* Recent Chats */}
          {expanded && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between px-3 mb-1">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--ink-3)]">Recent</span>
                <span className="text-[10px] font-mono text-[var(--ink-3)]">{chats.length}</span>
              </div>
              <div className="space-y-0.5">
                {chats.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-[var(--ink-3)]">No chats yet</p>
                ) : (
                  chats.map((chat) => {
                    const active = currentPage === "chat" && activeChatId === chat.id;
                    return (
                      <div
                        key={chat.id}
                        onClick={() => selectChat(chat.id)}
                        className={`group flex items-center gap-2 px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                          active
                            ? "glass-panel !rounded-xl text-[var(--ink-1)] font-medium"
                            : "text-[var(--ink-3)] hover:text-[var(--ink-2)] hover:bg-[rgba(255,255,255,0.03)]"
                        }`}
                      >
                        <MessageSquare size={13} className={`shrink-0 ${active ? "text-[var(--mane-gold)]" : "opacity-40"}`} />
                        <span className="truncate flex-1">{chat.title || "Untitled"}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[var(--ink-3)] hover:text-red-400 transition"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`border-t border-[rgba(255,255,255,0.06)] shrink-0 ${expanded ? "p-3" : "p-2"}`}>
          {!isPro && expanded && (
            <button onClick={handleUpgrade} className="w-full mb-2 flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold bg-[var(--mane-gold-glow)] border border-[rgba(214,168,79,0.2)] text-[var(--mane-gold-bright)] hover:bg-[rgba(214,168,79,0.12)] transition">
              <span className="flex items-center gap-1.5"><Zap size={13} /> Upgrade to Pro</span>
              <ChevronRight size={13} />
            </button>
          )}
          <div className={`flex items-center glass-panel !rounded-xl ${expanded ? "p-2 gap-2.5" : "p-1.5 justify-center"}`}>
            {profile?.avatar ? (
              <img src={profile.avatar} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0 ring-1 ring-[rgba(255,255,255,0.08)]" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-[rgba(255,255,255,0.06)] flex items-center justify-center shrink-0 text-xs font-bold text-[var(--ink-2)]">
                {profile?.nickname?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}
            {expanded && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold truncate text-[var(--ink-1)]">{profile?.nickname?.split(" ")[0] || "User"}</span>
                  {isPro && <span className="text-[9px] px-1 rounded font-bold bg-[var(--mane-gold-glow)] text-[var(--mane-gold)]">PRO</span>}
                </div>
                <span className="text-[10px] text-[var(--ink-3)] truncate block">{profile?.email || ""}</span>
              </div>
            )}
            {expanded && (
              <button onClick={handleLogout} className="p-1 rounded text-[var(--ink-3)] hover:text-red-400 transition" title="Sign out">
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
