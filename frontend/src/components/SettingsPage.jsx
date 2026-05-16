import { useState } from "react";

function SettingsPage({
  theme,

  profile,

  setProfile,
}) {
  const dark = theme === "dark";

  const [nickname, setNickname] = useState(profile?.nickname || "");

  // IMAGE UPLOAD

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

      localStorage.setItem(
        `simha_profile_${profile.email}`,
        JSON.stringify(updated),
      );
    };

    reader.readAsDataURL(file);
  };

  // SAVE SETTINGS

  const saveSettings = () => {
    const updated = {
      ...profile,

      nickname,
    };

    setProfile(updated);

    localStorage.setItem(
      `simha_profile_${profile.email}`,
      JSON.stringify(updated),
    );

    alert("Profile updated successfully!");
  };

  return (
    <div className="flex-1 overflow-y-auto p-10 bg-transparent">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-black text-amber-500 mb-10 tracking-tight">
          Settings
        </h1>

        <div className={`rounded-3xl p-10 shadow-2xl border transition-all duration-500 ${
          dark ? "bg-black/40 backdrop-blur-xl border-white/5" : "bg-white border-amber-100"
        }`}>
          {/* PROFILE IMAGE */}
          <div className="flex flex-col items-center mb-10">
            <div className="relative group">
              <img
                src={profile?.avatar || "/logo-lion.png"}
                alt="profile"
                className={`w-32 h-32 rounded-3xl object-cover mb-5 border-2 shadow-2xl transition-transform duration-500 group-hover:scale-105 ${
                  dark ? "border-amber-500/30" : "border-amber-200"
                }`}
              />
              {!profile?.avatar && <div className="absolute inset-0 logo-mask pointer-events-none"></div>}
            </div>

            <label className={`px-6 py-3 rounded-xl cursor-pointer font-bold tracking-tight transition-all duration-300 shadow-lg ${
              dark 
                ? "bg-amber-600 hover:bg-amber-500 text-black shadow-amber-900/20" 
                : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200/50"
            }`}>
              Upload New Photo
              <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
            </label>
          </div>

          {/* NICKNAME */}
          <div className="mb-8">
            <label className={`block mb-3 text-sm font-black uppercase tracking-widest ${dark ? "text-amber-500/60" : "text-amber-900/60"}`}>
              Nickname
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className={`w-full p-4 rounded-2xl outline-none border transition-all duration-300 ${
                dark 
                  ? "bg-white/5 border-white/10 text-white focus:border-amber-500/50 focus:bg-white/10" 
                  : "bg-amber-50/50 border-amber-200 text-amber-950 focus:border-amber-500 focus:bg-white"
              }`}
            />
          </div>

          {/* EMAIL */}
          <div className="mb-10">
            <label className={`block mb-3 text-sm font-black uppercase tracking-widest ${dark ? "text-amber-500/60" : "text-amber-900/60"}`}>
              Email
            </label>
            <input
              type="text"
              disabled
              value={profile?.email}
              className={`w-full p-4 rounded-2xl border ${
                dark 
                  ? "bg-black/20 border-white/5 text-gray-500" 
                  : "bg-gray-50 border-gray-100 text-gray-400"
              }`}
            />
          </div>

          {/* SAVE */}
          <button
            onClick={saveSettings}
            className={`w-full py-5 rounded-2xl text-lg font-black tracking-widest transition-all duration-500 shadow-xl ${
              dark 
                ? "bg-gradient-to-r from-amber-600 to-amber-400 text-black hover:shadow-amber-500/20" 
                : "bg-gradient-to-r from-amber-500 to-amber-400 text-white hover:shadow-amber-500/40"
            }`}
          >
            SAVE CHANGES
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
