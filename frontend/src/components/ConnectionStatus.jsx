import { useEffect, useState, useRef } from "react";
import { Wifi, WifiOff } from "lucide-react";
import API from "../services/api";

const CHECK_INTERVAL_MS = 30 * 1000;
const OFFLINE_THRESHOLD = 3;

export default function ConnectionStatus({ theme }) {
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
        setTimeout(() => { if (mountedRef.current) setVisible(false); }, 3000);
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
    const initialTimer = setTimeout(() => { if (mountedRef.current) checkStatus(); }, 15000);
    const interval = setInterval(() => { if (mountedRef.current) checkStatus(); }, CHECK_INTERVAL_MS);
    return () => { clearTimeout(initialTimer); clearInterval(interval); };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium glass-panel !rounded-full animate-fade-in"
      style={{
        color: status === "offline" ? "var(--error)" : "var(--success)",
        borderColor: status === "offline" ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)",
      }}
    >
      {status === "offline" ? (
        <>
          <WifiOff size={13} />
          <span>Server latency high — AI may take longer</span>
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
