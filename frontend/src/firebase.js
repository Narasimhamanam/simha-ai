import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  EmailAuthProvider,
} from "firebase/auth";

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

// ── Google: Default (no extra scopes) ──────────────────────────────────────
export const provider = new GoogleAuthProvider();

// ── Google: Gmail-scoped — only used for email composition ────────────────
export const gmailProvider = new GoogleAuthProvider();
gmailProvider.addScope("https://www.googleapis.com/auth/gmail.send");
gmailProvider.addScope("https://www.googleapis.com/auth/gmail.readonly");
gmailProvider.setCustomParameters({ prompt: "consent" });

// ── Google: Calendar-scoped — only used for event creation ────────────────
export const calendarProvider = new GoogleAuthProvider();
calendarProvider.addScope("https://www.googleapis.com/auth/calendar.events");
calendarProvider.setCustomParameters({ prompt: "consent" });

// ── Email/Password helper (used in AuthModal for credential creation) ──────
export const emailAuthProvider = EmailAuthProvider;