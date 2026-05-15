function ThemeToggle({ theme, setTheme }) {
  const dark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="
        px-5
        py-2.5
        rounded-full
        text-sm
        font-semibold
        text-white
        bg-gradient-to-r
        from-purple-600
        to-fuchsia-500
        hover:scale-105
        transition-all
      "
    >
      {dark ? "Light" : "Dark"}
    </button>
  );
}

export default ThemeToggle;
