import { useState } from "react";
import { Settings, User, Mail, Camera, Check, Shield, Cpu, Sparkles } from "lucide-react";

export default function SettingsPage({
  theme,
  profile,
  setProfile,
}) {
  const dark = theme === "dark";
  const [nickname, setNickname] = useState(profile?.nickname || "");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const updated = {
        ...profile,
        avatar: reader.result,
      };
      setProfile(updated);
      if (profile?.email) {
        localStorage.setItem(`simha_profile_${profile.email}`, JSON.stringify(updated));
      }
    };
    reader.readAsDataURL(file);
  };

  const saveSettings = () => {
    const updated = {
      ...profile,
      nickname: nickname.trim() || profile?.nickname || "User",
    };
    setProfile(updated);
    if (profile?.email) {
      localStorage.setItem(`simha_profile_${profile.email}`, JSON.stringify(updated));
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f8fafc] dark:bg-[#09090b]">
      
      {/* ── HEADER ── */}
      <div className="px-6 py-6 border-b border-slate-200/80 dark:border-white/[0.07] shrink-0 bg-white/50 dark:bg-[#0c0c0e]/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Settings size={20} className="text-amber-500" />
            Account & Workspace Preferences
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Manage your personal profile, identity, and AI configuration
          </p>
        </div>
      </div>

      {/* ── SETTINGS BODY ── */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Card: Profile Identity */}
          <div className="rounded-3xl bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-white/[0.07] p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-100 dark:border-white/[0.04] pb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User size={16} className="text-amber-500" />
                Profile Identity
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Customize how agents and workspace members address you
              </p>
            </div>

            {/* Avatar Row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="relative group w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-slate-200 dark:ring-white/[0.1] shrink-0 bg-slate-100 dark:bg-white/[0.04]">
                {profile?.avatar ? (
                  <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-xl text-slate-700 dark:text-zinc-300">
                    {profile?.nickname?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}
                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition text-white">
                  <Camera size={18} />
                  <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
                </label>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="btn-secondary self-start cursor-pointer text-xs flex items-center gap-1.5">
                  <Camera size={13} />
                  <span>Upload New Picture</span>
                  <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
                </label>
                <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                  Recommended size 256x256. PNG, JPG or WebP.
                </span>
              </div>
            </div>

            {/* Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Display Name / Nickname
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Your Name"
                  className="w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.03] px-3.5 py-2.5 text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-amber-500/50 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Connected Email
                </label>
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100/60 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.05] text-xs text-slate-500 dark:text-zinc-500">
                  <Mail size={13} />
                  <span className="truncate">{profile?.email || "No email verified"}</span>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-white/[0.04]">
              {savedSuccess ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-fade-in">
                  <Check size={14} /> Profile preferences saved!
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                  Changes persist across browser sessions
                </span>
              )}

              <button
                onClick={saveSettings}
                className="btn-primary"
              >
                Save Preferences
              </button>
            </div>
          </div>

          {/* Card: Active Engine & System Info */}
          <div className="rounded-3xl bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-white/[0.07] p-6 sm:p-8 shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-white/[0.04] pb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Cpu size={16} className="text-amber-500" />
                Inference Engine & Model Specs
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Current active LLM infrastructure powering Simha AI agents
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.05]">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-500 block mb-1">
                  Primary Model
                </span>
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-zinc-200">
                  qwen/qwen3.8-27b
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.05]">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-500 block mb-1">
                  Context Window
                </span>
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-zinc-200">
                  131,072 Tokens
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.05]">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-500 block mb-1">
                  Failover Chain
                </span>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  Active (4 Fallbacks)
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
