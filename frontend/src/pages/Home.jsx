import { useState, useEffect } from "react";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import ChatArea from "../components/ChatArea";
import ChatHistoryPage from "../components/ChatHistoryPage";
import SettingsPage from "../components/SettingsPage";

import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "firebase/auth";

import {
  auth,
  provider
} from "../firebase";

import API from "../services/api";

function Home() {

  const [theme, setTheme] =
    useState("dark");

  const [user, setUser] =
    useState(null);

  const [profile, setProfile] =
    useState(null);

  const [currentPage, setCurrentPage] =
    useState("chat");

  // CHATS STATES

  const [chats, setChats] =
    useState([]);

  const [activeChatId, setActiveChatId] =
    useState(null);

  // -----------------------------
  // FETCH USER CHATS FROM MONGODB
  // -----------------------------

  const fetchChats = async (email) => {

    try {

      const res = await API.get(

        `/get-chats/${email}`

      );

      if (res.data.length > 0) {

        setChats(res.data);

        setActiveChatId(
          res.data[0].id
        );

      } else {

        // CREATE FIRST CHAT

        const createRes =
          await API.post(

            "/create-chat",

            {

              user_email: email,

              title: "New Chat"

            }

          );

        const newChat = {

          id: createRes.data.chat_id,

          title: "New Chat",

          messages: []

        };

        setChats([newChat]);

        setActiveChatId(
          newChat.id
        );

      }

    } catch (error) {

      console.log(error);

    }

  };

  // -----------------------------
  // CREATE NEW CHAT
  // -----------------------------

  const createNewChat =
    async () => {

      try {

        const res =
          await API.post(

            "/create-chat",

            {

              user_email:
                user.email,

              title:
                "New Chat"

            }

          );

        const newChat = {

          id:
            res.data.chat_id,

          title:
            "New Chat",

          messages: []

        };

        setChats((prev) => [

          newChat,
          ...prev

        ]);

        setActiveChatId(
          newChat.id
        );

        setCurrentPage("chat");

      } catch (error) {

        console.log(error);

      }

    };

  // -----------------------------
  // AUTH
  // -----------------------------

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(

        auth,

        async (currentUser) => {

          setUser(currentUser);

          if (!currentUser)
            return;

          await fetchChats(

            currentUser.email

          );

        }

      );

    return () =>
      unsubscribe();

  }, []);

  // -----------------------------
  // PROFILE
  // -----------------------------

  useEffect(() => {

    if (!user) return;

    const savedProfile =
      localStorage.getItem(

        `simha_profile_${user.email}`

      );

    const profileToSet =
      savedProfile

        ? JSON.parse(
            savedProfile
          )

        : {

            nickname:
              user.displayName,

            email:
              user.email,

            avatar:
              user.photoURL

          };

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(profileToSet);

  }, [user]);

  // -----------------------------
  // LOGIN
  // -----------------------------

  const handleGoogleLogin =
    async () => {

      try {

        await signInWithPopup(

          auth,
          provider

        );

      } catch (error) {

        console.log(error);

      }

    };

  // -----------------------------
  // LOGOUT
  // -----------------------------

  const handleLogout =
    async () => {

      await signOut(auth);

    };

  // -----------------------------
  // ACTIVE CHAT
  // -----------------------------

  const activeChat =
    chats.find(

      (chat) =>

        chat.id ===
        activeChatId

    );

  // -----------------------------
  // LOGIN SCREEN
  // -----------------------------

  if (!user) {

    return (

      <div className="
        min-h-screen
        flex
        items-center
        justify-center
        bg-[#202123]
        text-white
      ">

        <div className="
          bg-[#2a2a2a]
          p-10
          rounded-3xl
          shadow-2xl
          text-center
          w-[420px]
        ">

          <h1 className="
            text-5xl
            font-bold
            text-purple-500
            mb-5
          ">
            Simha AI
          </h1>

          <p className="
            text-gray-400
            mb-10
          ">
            Your intelligent AI assistant
          </p>

          <button

            onClick={
              handleGoogleLogin
            }

            className="
              w-full
              bg-purple-600
              hover:bg-purple-700
              transition
              py-4
              rounded-2xl
              font-semibold
              text-lg
            "
          >

            Continue with Google

          </button>

        </div>

      </div>

    );

  }

  // -----------------------------
  // MAIN UI
  // -----------------------------

  return (

    <div className={`

      min-h-screen
      flex

      ${theme === "dark"

        ? "bg-[#202123] text-white"

        : "bg-[#f5f5f7] text-black"}

    `}>

      <Sidebar

        theme={theme}

        chats={chats}
        setChats={setChats}

        activeChatId={
          activeChatId
        }

        setActiveChatId={
          setActiveChatId
        }

        setCurrentPage={
          setCurrentPage
        }

        currentPage={
          currentPage
        }

        createNewChat={
          createNewChat
        }

        profile={profile}

        handleLogout={
          handleLogout
        }

      />

      <div className="
        flex-1
        flex
        flex-col
        h-screen
      ">

        <Header

          theme={theme}

          setTheme={
            setTheme
          }

          profile={profile}

        />

        {currentPage ===
          "chat" && (

          <ChatArea

            theme={theme}

            chats={chats}

            setChats={
              setChats
            }

            activeChat={
              activeChat
            }

            activeChatId={
              activeChatId
            }

            user={user}

          />

        )}

        {currentPage ===
          "history" && (

          <ChatHistoryPage

            theme={theme}

            chats={chats}

            setActiveChatId={
              setActiveChatId
            }

            setCurrentPage={
              setCurrentPage
            }

          />

        )}

        {currentPage ===
          "settings" && (

          <SettingsPage

            theme={theme}

            profile={profile}

            setProfile={
              setProfile
            }

          />

        )}

      </div>

    </div>

  );

}

export default Home;