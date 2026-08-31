import { useState } from "react";
import { Settings, User, Mail, Camera, Check, Shield, Cpu, Sparkles } from "lucide-react";

export default function SettingsPage({ theme, profile, setProfile }) {
  const [tab, setTab] = useState("profile");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (profile?.email) {
      localStorage.setItem(`simha_profile_${profile.email}`, JSON.stringify(profile));
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
    { id: "account", label: "Account", icon: Shield },
    { id: "model", label: "AI Model", icon: Cpu },
  ];

  const inputCls = "w-full rounded-xl border border-[var(--edge-subtle)] bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-[var(--mane-gold)] transition";

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: "var(--void)", color: "var(--ink-1)" }}>
      
      {/* Header */}
      <div className="px-6 py-6 border-b border-[var(--edge-subtle)] shrink-0" style={{ background: "var(--glass)" }}>
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Settings size={20} style={{ color: "var(--mane-gold)" }} /> Preferences
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>
            Customize your Simha AI experience
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-2xl mx-auto">
          
          {/* Tab bar */}
          <div className="flex items-center gap-1 mb-6 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--edge-subtle)" }}>
            {tabs.map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    active ? "glass-panel !rounded-lg" : ""
                  }`}
                  style={{ color: active ? "var(--ink-1)" : "var(--ink-3)" }}
                >
                  <Icon size={13} style={active ? { color: "var(--mane-gold)" } : {}} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="glass-panel p-6 space-y-5 animate-fade-in">
            {tab === "profile" && (
              <>
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {profile?.avatar ? (
                      <img src={profile.avatar} alt="" className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[var(--edge-subtle)]" />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-bold" style={{ background: "var(--mane-gold-glow)", color: "var(--mane-gold)", border: "1px solid rgba(214,168,79,0.2)" }}>
                        {profile?.nickname?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    )}
                    <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer"
                      style={{ background: "var(--glass-strong)", border: "1px solid var(--edge-subtle)", color: "var(--ink-3)" }}>
                      <Camera size={11} />
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    </label>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{profile?.nickname || "User"}</p>
                    <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>{profile?.email || ""}</p>
                  </div>
                </div>

                {/* Nickname */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--ink-2)" }}>Display Name</label>
                  <input
                    type="text" value={profile?.nickname || ""}
                    onChange={(e) => setProfile((p) => ({ ...p, nickname: e.target.value }))}
                    className={inputCls} style={{ color: "var(--ink-1)" }}
                  />
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: "var(--ink-2)" }}>
                    <Mail size={12} /> Email
                  </label>
                  <input type="email" value={profile?.email || ""} readOnly
                    className={`${inputCls} cursor-not-allowed opacity-60`} style={{ color: "var(--ink-3)" }} />
                </div>
              </>
            )}

            {tab === "account" && (
              <div className="text-center py-8">
                <Shield size={28} className="mx-auto mb-3" style={{ color: "var(--ink-3)" }} />
                <p className="text-sm font-semibold">Account Security</p>
                <p className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>
                  Authentication is managed via Google OAuth. No password changes needed.
                </p>
              </div>
            )}

            {tab === "model" && (
              <div className="text-center py-8">
                <Sparkles size={28} className="mx-auto mb-3" style={{ color: "var(--mane-gold)" }} />
                <p className="text-sm font-semibold">AI Model Configuration</p>
                <p className="text-xs mt-1 max-w-sm mx-auto" style={{ color: "var(--ink-3)" }}>
                  Simha AI uses Groq Qwen-27B as the primary inference model. Model selection is managed server-side.
                </p>
              </div>
            )}
          </div>

          {/* Save */}
          <div className="mt-4 flex justify-end">
            <button onClick={handleSave} className="btn-gold flex items-center gap-2">
              {saved ? <Check size={14} className="text-emerald-400" /> : <Sparkles size={14} />}
              <span>{saved ? "Saved!" : "Save Preferences"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
