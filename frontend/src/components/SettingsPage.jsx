import { useState } from "react";

function SettingsPage({

  theme,

  profile,

  setProfile

}) {

  const dark =
    theme === "dark";

  const [nickname, setNickname] =
    useState(profile?.nickname || "");

  // IMAGE UPLOAD

  const handleImageUpload =
    (e) => {

      const file =
        e.target.files[0];

      if (!file) return;

      const reader =
        new FileReader();

      reader.onloadend = () => {

        const updated = {

          ...profile,

          avatar: reader.result

        };

        setProfile(updated);

        localStorage.setItem(
          `simha_profile_${profile.email}`,
          JSON.stringify(updated)
        );

      };

      reader.readAsDataURL(file);

    };

  // SAVE SETTINGS

  const saveSettings = () => {

    const updated = {

      ...profile,

      nickname

    };

    setProfile(updated);

    localStorage.setItem(
      `simha_profile_${profile.email}`,
      JSON.stringify(updated)
    );

    alert("Profile updated successfully!");

  };

  return (

    <div className="
      flex-1
      overflow-y-auto
      p-10
    ">

      <div className="
        max-w-2xl
        mx-auto
      ">

        <h1 className="
          text-4xl
          font-bold
          text-purple-500
          mb-10
        ">
          Settings
        </h1>

        <div className={`
          rounded-3xl
          p-10

          ${dark
            ? "bg-[#232323]"
            : "bg-white"}

          shadow-lg
        `}>

          {/* PROFILE IMAGE */}

          <div className="
            flex
            flex-col
            items-center
            mb-10
          ">

            <img

              src={profile?.avatar}

              alt="profile"

              className="
                w-32
                h-32
                rounded-full
                object-cover
                mb-5
                border-4
                border-purple-500
              "
            />

            <label className="
              bg-purple-600
              hover:bg-purple-700
              transition
              px-5
              py-3
              rounded-xl
              cursor-pointer
            ">

              Upload New Photo

              <input

                type="file"

                hidden

                accept="image/*"

                onChange={
                  handleImageUpload
                }

              />

            </label>

          </div>

          {/* NICKNAME */}

          <div className="mb-8">

            <label className="
              block
              mb-3
              text-lg
              font-semibold
            ">
              Nickname
            </label>

            <input

              type="text"

              value={nickname}

              onChange={(e) =>
                setNickname(
                  e.target.value
                )
              }

              className={`
                w-full
                p-4
                rounded-2xl
                outline-none

                ${dark
                  ? "bg-[#171717] text-white"
                  : "bg-gray-100 text-black"}
              `}
            />

          </div>

          {/* EMAIL */}

          <div className="mb-10">

            <label className="
              block
              mb-3
              text-lg
              font-semibold
            ">
              Email
            </label>

            <input

              type="text"

              disabled

              value={profile?.email}

              className={`
                w-full
                p-4
                rounded-2xl

                ${dark
                  ? "bg-[#171717] text-gray-400"
                  : "bg-gray-100 text-gray-500"}
              `}
            />

          </div>

          {/* SAVE */}

          <button

            onClick={saveSettings}

            className="
              w-full
              bg-purple-600
              hover:bg-purple-700
              transition
              py-4
              rounded-2xl
              text-lg
              font-semibold
            "
          >

            Save Changes

          </button>

        </div>

      </div>

    </div>

  );

}

export default SettingsPage;