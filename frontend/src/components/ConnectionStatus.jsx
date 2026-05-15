import { useEffect, useState } from "react";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import API from "../services/api";

const CHECK_INTERVAL_MS = 30 * 1000; // check every 30s

export default function ConnectionStatus({ theme }) {
  const dark = theme === "dark";
  const [status, setStatus] = useState("checking"); // "online" | "offline" | "checking"
  const [visible, setVisible] = useState(false);

  const checkStatus = async () => {
    try {
      await API.get("/ping", { timeout: 8000 });
      if (status !== "online") {
        setStatus("online");
        setVisible(true);
        // Hide the "back online" toast after 3 seconds
        setTimeout(() => setVisible(false), 3000);
      }
    } catch {
      setStatus("offline");
      setVisible(true);
    }
  };

  useEffect(() => {
    // Initial check
    checkStatus();
    const interval = setInterval(checkStatus, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 px-4 py-2.5 rounded-full text-xs font-medium shadow-xl border transition-all duration-300 ${
        status === "offline"
          ? dark
            ? "bg-red-950 border-red-800 text-red-300"
            : "bg-red-50 border-red-200 text-red-700"
          : status === "checking"
          ? dark
            ? "bg-yellow-950 border-yellow-800 text-yellow-300"
            : "bg-yellow-50 border-yellow-200 text-yellow-700"
          : dark
          ? "bg-green-950 border-green-800 text-green-300"
          : "bg-green-50 border-green-200 text-green-700"
      }`}
    >
      {status === "offline" && (
        <>
          <WifiOff size={13} />
          <span>Server offline — AI may be slow. Retrying...</span>
        </>
      )}
      {status === "checking" && (
        <>
          <Loader2 size={13} className="animate-spin" />
          <span>Connecting to AI server...</span>
        </>
      )}
      {status === "online" && (
        <>
          <Wifi size={13} />
          <span>Connected ✓</span>
        </>
      )}
    </div>
  );
}
