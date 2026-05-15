import { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import ChatArea from "../components/ChatArea";
import ChatHistoryPage from "../components/ChatHistoryPage";
import SettingsPage from "../components/SettingsPage";
import EmailComposer from "../components/EmailComposer";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, provider } from "../firebase";
import API from "../services/api";

function Home() {
  const [theme, setTheme] = useState("dark");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [theme]);

  // Close sidebar on desktop resize
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 768) setIsSidebarOpen(false); };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const isDevGuest = (import.meta.env.VITE_DEV_GUEST || "").toString().toLowerCase() === "true";

  const [user, setUser] = useState(isDevGuest ? { email: "guest@local", displayName: "Guest", photoURL: null } : null);
  const [profile, setProfile] = useState(null);
  const [currentPage, setCurrentPage] = useState("chat");
  const guestChatId = "local-guest-chat";
  const [chats, setChats] = useState(isDevGuest ? [{ id: guestChatId, title: "New Chat", messages: [] }] : []);
  const [activeChatId, setActiveChatId] = useState(isDevGuest ? guestChatId : null);

  const fetchChats = useCallback(async (email) => {
    try {
      const res = await API.get(`/get-chats/${email}`);
      if (res.data.length > 0) {
        setChats(res.data);
        setActiveChatId(res.data[0].id);
      } else {
        const createRes = await API.post("/create-chat", { user_email: email, title: "New Chat" });
        const newChat = { id: createRes.data.chat_id, title: "New Chat", messages: [] };
        setChats([newChat]);
        setActiveChatId(newChat.id);
      }
    } catch (error) { console.log(error); }
  }, []);

  const createNewChat = async () => {
    try {
      const res = await API.post("/create-chat", { user_email: user.email, title: "New Chat" });
      const newChat = { id: res.data.chat_id, title: "New Chat", messages: [] };
      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(newChat.id);
      setCurrentPage("chat");
      setIsSidebarOpen(false); // close sidebar on mobile after creating chat
    } catch (error) { console.log(error); }
  };

  useEffect(() => {
    if (isDevGuest) return;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) return;
      await fetchChats(currentUser.email);
    });
    return () => unsubscribe();
  }, [isDevGuest, fetchChats]);

  useEffect(() => {
    if (!user) return;
    const saved = localStorage.getItem(`simha_profile_${user.email}`);
    setProfile(saved ? JSON.parse(saved) : { nickname: user.displayName, email: user.email, avatar: user.photoURL });
  }, [user]);

  const handleGoogleLogin = async () => {
    try { await signInWithPopup(auth, provider); }
    catch (error) { console.log(error); }
  };

  const handleLogout = async () => { await signOut(auth); };
  const activeChat = chats.find((c) => c.id === activeChatId);

  // ── LOGIN SCREEN ──
  if (!user) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-[#0a0a0a] px-4">
        <div className="w-full max-w-sm bg-[#141414] border border-gray-800 p-8 rounded-2xl shadow-2xl text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-purple-500/30">
            <span className="text-white text-xl font-bold">S</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1.5">Simha AI</h1>
          <p className="text-sm text-gray-500 mb-8">Your intelligent multi-agent assistant</p>
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 active:bg-gray-100 transition-all text-gray-900 py-3 rounded-xl font-medium text-sm touch-manipulation"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>
          <p className="text-xs text-gray-700 mt-5">By continuing, you agree to our Terms of Service</p>
        </div>
      </div>
    );
  }

  // ── MAIN UI ──
  return (
    <div className="h-screen h-[100dvh] flex overflow-hidden text-sm bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100">
      {/* SIDEBAR */}
      <Sidebar
        theme={theme}
        chats={chats}
        setChats={setChats}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
        setCurrentPage={setCurrentPage}
        currentPage={currentPage}
        createNewChat={createNewChat}
        profile={profile}
        handleLogout={handleLogout}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      {/* EMAIL COMPOSER MODAL */}
      {currentPage === "email" && (
        <EmailComposer
          theme={theme}
          profile={profile}
          onClose={() => setCurrentPage("chat")}
        />
      )}

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header
          theme={theme}
          setTheme={setTheme}
          profile={profile}
          setIsSidebarOpen={setIsSidebarOpen}
          activeChat={activeChat}
        />

        {currentPage === "chat" && (
          <ChatArea
            theme={theme}
            chats={chats}
            setChats={setChats}
            activeChat={activeChat}
            activeChatId={activeChatId}
            user={user}
          />
        )}
        {currentPage === "history" && (
          <ChatHistoryPage
            theme={theme}
            chats={chats}
            setActiveChatId={setActiveChatId}
            setCurrentPage={setCurrentPage}
          />
        )}
        {currentPage === "settings" && (
          <SettingsPage theme={theme} profile={profile} setProfile={setProfile} />
        )}
      </div>
    </div>
  );
}

export default Home;
