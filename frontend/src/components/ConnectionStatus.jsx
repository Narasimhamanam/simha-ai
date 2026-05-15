import { useEffect, useState, useRef } from "react";
import { Wifi, WifiOff } from "lucide-react";
import API from "../services/api";

const CHECK_INTERVAL_MS = 30 * 1000;
// Only show "offline" after this many consecutive failed pings
// Prevents false alarm on cold start
const OFFLINE_THRESHOLD = 3;

export default function ConnectionStatus({ theme }) {
  const dark = theme === "dark";
  const [status, setStatus] = useState("online"); // start optimistic — don't scare users
  const [visible, setVisible] = useState(false);
  const failCountRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const checkStatus = async () => {
    try {
      await API.get("/ping", { timeout: 10000 });
      if (!mountedRef.current) return;

      failCountRef.current = 0; // reset fail streak
      if (status !== "online") {
        setStatus("online");
        setVisible(true);
        setTimeout(() => {
          if (mountedRef.current) setVisible(false);
        }, 3000);
      }
      // If already online and stable, keep banner hidden
    } catch {
      if (!mountedRef.current) return;
      failCountRef.current += 1;

      // Only show offline banner after OFFLINE_THRESHOLD consecutive failures
      // This prevents false alarms during Railway cold-start warm-up
      if (failCountRef.current >= OFFLINE_THRESHOLD) {
        setStatus("offline");
        setVisible(true);
      }
    }
  };

  useEffect(() => {
    // Delay first check by 15s — let Railway warm up before declaring it offline
    const initialTimer = setTimeout(() => {
      if (mountedRef.current) checkStatus();
    }, 15000);

    const interval = setInterval(() => {
      if (mountedRef.current) checkStatus();
    }, CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 px-4 py-2.5 rounded-full text-xs font-medium shadow-xl border transition-all duration-500 animate-fade-in ${
        status === "offline"
          ? dark
            ? "bg-red-950 border-red-800 text-red-300"
            : "bg-red-50 border-red-200 text-red-700"
          : dark
          ? "bg-green-950 border-green-800 text-green-300"
          : "bg-green-50 border-green-200 text-green-700"
      }`}
    >
      {status === "offline" ? (
        <>
          <WifiOff size={13} />
          <span>Connection slow — AI may take longer to respond</span>
        </>
      ) : (
        <>
          <Wifi size={13} />
          <span>Connected ✓</span>
        </>
      )}
    </div>
  );
}
