import ThemeToggle from "./ThemeToggle";

function Header({

  theme,
  setTheme,

  profile

}) {

  return (

    <div className="
      flex
      justify-between
      items-center
      px-10
      pt-8
      pb-4
    ">

      <div>

        <h1 className="
          text-5xl
          font-bold
        ">
          👋 Good Morning,
          <span className="
            text-purple-500
          ">
            {" "}
            {profile?.nickname}
          </span>
        </h1>

        <p className="
          mt-3
          text-gray-400
          text-lg
        ">
          How can I help you today?
        </p>

      </div>

      <ThemeToggle
        theme={theme}
        setTheme={setTheme}
      />

    </div>

  );

}

export default Header;