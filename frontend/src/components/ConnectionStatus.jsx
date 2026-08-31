import { useEffect, useState, useRef } from "react";
import { Wifi, WifiOff, AlertTriangle } from "lucide-react";
import API from "../services/api";

const CHECK_INTERVAL_MS = 30 * 1000;
const OFFLINE_THRESHOLD = 3;

export default function ConnectionStatus({ theme }) {
  const dark = theme === "dark";
  const [status, setStatus] = useState("online");
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

      failCountRef.current = 0;
      if (status !== "online") {
        setStatus("online");
        setVisible(true);
        setTimeout(() => {
          if (mountedRef.current) setVisible(false);
        }, 3000);
      }
    } catch {
      if (!mountedRef.current) return;
      failCountRef.current += 1;

      if (failCountRef.current >= OFFLINE_THRESHOLD) {
        setStatus("offline");
        setVisible(true);
      }
    }
  };

  useEffect(() => {
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
      className={`fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium shadow-xl border transition-all duration-300 animate-fade-in ${
        status === "offline"
          ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400 backdrop-blur-md"
          : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 backdrop-blur-md"
      }`}
    >
      {status === "offline" ? (
        <>
          <WifiOff size={13} />
          <span>Server latency high — AI may take longer to respond</span>
        </>
      ) : (
        <>
          <Wifi size={13} />
          <span>Connection restored</span>
        </>
      )}
    </div>
  );
}
