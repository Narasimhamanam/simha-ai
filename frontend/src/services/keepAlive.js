/**
 * keepAlive.js
 * Pings the Railway backend every 8 minutes to prevent cold-start sleep.
 * Railway free tier sleeps after ~15 min of inactivity — this keeps it warm.
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://simha-ai-production.up.railway.app";
const PING_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes — Railway sleeps after ~10min inactivity

let intervalId = null;

export function startKeepAlive() {
  if (intervalId) return; // already running

  const ping = async () => {
    try {
      await fetch(`${BACKEND_URL}/ping`, { method: "GET" });
    } catch {
      // Silently ignore — server might be momentarily unavailable
    }
  };

  // Ping once immediately on start
  ping();

  // Then keep pinging every 8 minutes
  intervalId = setInterval(ping, PING_INTERVAL_MS);
}

export function stopKeepAlive() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
