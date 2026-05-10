import ThemeToggle from "./ThemeToggle";

function Header({
  theme,
  setTheme,
  profile,
}) {
  return (
    <div
      className="

        flex
        justify-between
        items-center

        px-6
        pt-5
        pb-3

        border-b

        border-gray-800

      "
    >
      {/* LEFT */}

      <div>
        <h1
          className="

            text-3xl
            font-semibold

            text-white

            leading-tight

          "
        >
          👋 Good Morning,
          <span
            className="

              text-purple-500

            "
          >
            {" "}
            {profile?.nickname}
          </span>
        </h1>

        <p
          className="

            mt-1.5

            text-gray-400

            text-sm

          "
        >
          How can I help you today?
        </p>
      </div>

      {/* RIGHT */}

      <div className="flex items-center gap-3">
        <ThemeToggle
          theme={theme}
          setTheme={setTheme}
        />
      </div>
    </div>
  );
}

export default Header;