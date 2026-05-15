import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || "https://simha-ai-production.up.railway.app",
});

export default API;
