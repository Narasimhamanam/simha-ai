import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Default provider for login (no Gmail scope)
export const provider = new GoogleAuthProvider();

// Gmail-scoped provider — used only when user requests email sending
export const gmailProvider = new GoogleAuthProvider();
gmailProvider.addScope("https://www.googleapis.com/auth/gmail.send");
gmailProvider.addScope("https://www.googleapis.com/auth/gmail.readonly");
// Force consent screen so user explicitly grants Gmail permission
gmailProvider.setCustomParameters({ prompt: "consent" });

// Calendar-scoped provider — used only for event creation
export const calendarProvider = new GoogleAuthProvider();
calendarProvider.addScope("https://www.googleapis.com/auth/calendar.events");
calendarProvider.setCustomParameters({ prompt: "consent" });