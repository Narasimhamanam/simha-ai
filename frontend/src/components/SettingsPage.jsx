import { useState } from "react";
import { Settings, User, Mail, Camera, Check, Shield, Cpu, Sparkles, Zap, Crown } from "lucide-react";

export default function SettingsPage({
  theme,
  profile,
  setProfile,
  isPro,
  daysRemaining,
  onNavigateToPricing,
}) {
  const [tab, setTab] = useState("profile");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (profile?.email) {
      localStorage.setItem(`astra_profile_${profile.email}`, JSON.stringify(profile));
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfile((prev) => ({ ...prev, avatar: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "pass", label: "Astra Pass & Plan", icon: Zap },
    { id: "account", label: "Security", icon: Shield },
    { id: "model", label: "AI Architecture", icon: Cpu },
  ];

  const inputCls =
    "w-full rounded-xl border border-[var(--edge-subtle)] bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-[var(--astra-cyan)] transition";

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--void)] text-[var(--ink-1)]">
      
      {/* Header */}
      <div className="px-6 py-6 border-b border-[var(--edge-subtle)] shrink-0 glass-header">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Settings size={20} className="text-[var(--astra-cyan)]" /> Preferences & Account
          </h1>
          <p className="text-xs mt-1 text-[var(--ink-3)]">
            Manage your Astra AI profile, subscriptions, and system settings
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-2xl mx-auto">
          
          {/* Tab bar */}
          <div className="flex items-center gap-1 mb-6 p-1 rounded-xl bg-white/5 border border-[var(--edge-subtle)]">
            {tabs.map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    active ? "glass-panel !rounded-lg text-[var(--ink-1)]" : "text-[var(--ink-3)] hover:text-[var(--ink-1)]"
                  }`}
                >
                  <Icon size={13} className={active ? "text-[var(--astra-cyan)]" : ""} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="glass-panel p-6 space-y-5 animate-fade-in">
            
            {/* PROFILE TAB */}
            {tab === "profile" && (
              <>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {profile?.avatar ? (
                      <img src={profile.avatar} alt="" className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[var(--edge)]" />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-bold bg-[var(--astra-glow)] text-[var(--astra-cyan)] border border-[var(--edge)]">
                        {profile?.nickname?.charAt(0)?.toUpperCase() || "A"}
                      </div>
                    )}
                    <label
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer glass-panel"
                      title="Upload avatar"
                    >
                      <Camera size={11} className="text-[var(--ink-2)]" />
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    </label>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{profile?.nickname || "Astra User"}</p>
                    <p className="text-[11px] text-[var(--ink-3)]">{profile?.email || ""}</p>
                    {isPro && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--astra-glow)] text-[var(--astra-cyan)] mt-1 border border-[var(--edge)]">
                        <Crown size={10} /> 7-Day Pass Active
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-[var(--ink-2)]">Display Name</label>
                  <input
                    type="text"
                    value={profile?.nickname || ""}
                    onChange={(e) => setProfile((p) => ({ ...p, nickname: e.target.value }))}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 flex items-center gap-1 text-[var(--ink-2)]">
                    <Mail size={12} /> Email (Authenticated via Google OAuth)
                  </label>
                  <input
                    type="email"
                    value={profile?.email || ""}
                    readOnly
                    className={`${inputCls} cursor-not-allowed opacity-60`}
                  />
                </div>
              </>
            )}

            {/* PASS & PLAN TAB */}
            {tab === "pass" && (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-white/5 border border-[var(--edge-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-3)]">Current Tier</span>
                      <span
                        className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                          isPro
                            ? "bg-[var(--astra-glow)] text-[var(--astra-cyan)] border border-[var(--edge)]"
                            : "bg-white/10 text-[var(--ink-2)]"
                        }`}
                      >
                        {isPro ? "Astra 7-Day Pass" : "Astra Free"}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--ink-3)]">
                      {isPro
                        ? `Your pass expires in ${daysRemaining || 7} days. Higher message limits and premium features are active.`
                        : "Limited to 10 daily messages and 2 documents. Upgrade for 100 daily messages and complete multi-agent access."}
                    </p>
                  </div>

                  <button
                    onClick={onNavigateToPricing}
                    className="btn-astra self-start sm:self-auto text-xs font-bold shrink-0"
                  >
                    {isPro ? "Renew Pass — ₹99" : "Get 7-Day Pass — ₹99"}
                  </button>
                </div>
              </div>
            )}

            {/* SECURITY TAB */}
            {tab === "account" && (
              <div className="text-center py-6">
                <Shield size={28} className="mx-auto mb-3 text-[var(--astra-cyan)]" />
                <p className="text-sm font-semibold">Account Authentication</p>
                <p className="text-xs mt-1 text-[var(--ink-3)] max-w-sm mx-auto">
                  Identity is managed securely via Google OAuth. Session tokens are checked server-side on every transaction and data request.
                </p>
              </div>
            )}

            {/* MODEL TAB */}
            {tab === "model" && (
              <div className="text-center py-6">
                <Sparkles size={28} className="mx-auto mb-3 text-[var(--astra-cyan)]" />
                <p className="text-sm font-semibold">Astra Multi-Agent Architecture</p>
                <p className="text-xs mt-1 max-w-sm mx-auto text-[var(--ink-3)] leading-relaxed">
                  Astra routes requests via our server-side ModelRouter to high-speed commercial infrastructure. API keys are kept 100% server-side.
                </p>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="mt-4 flex justify-end">
            <button onClick={handleSave} className="btn-astra flex items-center gap-2 text-xs font-bold">
              {saved ? <Check size={14} className="text-emerald-950" /> : <Sparkles size={14} />}
              <span>{saved ? "Saved!" : "Save Preferences"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
