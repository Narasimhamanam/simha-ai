import axios from "axios";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  "https://simha-ai-backend.onrender.com";

const API = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000, // 30s default timeout for regular requests
});

// ── Retry interceptor ──────────────────────────────────────────────────────
// Automatically retries failed requests (network errors, 5xx) up to 2 times
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Skip retry for client-side errors (4xx) or if already retried twice
    if (error.response?.status < 500 && error.response?.status !== undefined) {
      return Promise.reject(error);
    }

    config.__retryCount = config.__retryCount || 0;
    if (config.__retryCount >= 2) {
      return Promise.reject(error);
    }

    config.__retryCount += 1;
    const delay = config.__retryCount * 2000; // 2s, 4s

    await new Promise((resolve) => setTimeout(resolve, delay));
    return API(config);
  }
);

export default API;
