import axios from "axios";
import { auth } from "../firebase";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  "https://simha-ai-backend.onrender.com";

const API = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000, // 30s default timeout for regular requests
});

// ── Request interceptor ───────────────────────────────────────────────────
// Automatically attaches fresh Firebase ID token and user email headers
API.interceptors.request.use(
  async (config) => {
    try {
      const currentUser = auth?.currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        if (token) {
          config.headers["Authorization"] = `Bearer ${token}`;
        }
        if (currentUser.email) {
          config.headers["X-User-Email"] = currentUser.email;
        }
      }
    } catch {
      // Non-blocking: proceed with existing headers
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response & Retry interceptor ──────────────────────────────────────────
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config) return Promise.reject(error);

    // Fast-fail health/ping checks — do not delay with retries
    if (config.url?.includes("/ping") || config.skipRetry) {
      return Promise.reject(error);
    }

    // 401: Attempt a single token refresh
    if (error.response?.status === 401 && !config.__tokenRefreshed) {
      config.__tokenRefreshed = true;
      try {
        const currentUser = auth?.currentUser;
        if (currentUser) {
          const freshToken = await currentUser.getIdToken(true);
          config.headers["Authorization"] = `Bearer ${freshToken}`;
          return API(config);
        }
      } catch {
        // Refresh failed, let 401 bubble up
      }
      return Promise.reject(error);
    }

    // Skip retry for client-side errors (4xx) or if already retried twice
    if (error.response?.status < 500 && error.response?.status !== undefined) {
      return Promise.reject(error);
    }

    config.__retryCount = config.__retryCount || 0;
    if (config.__retryCount >= 2) {
      return Promise.reject(error);
    }

    config.__retryCount += 1;
    const delay = config.__retryCount * 1500; // 1.5s, 3s

    await new Promise((resolve) => setTimeout(resolve, delay));
    return API(config);
  }
);

export default API;
