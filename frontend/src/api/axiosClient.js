import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export const TOKEN_STORAGE_KEY = "chronos.token";
export const USER_STORAGE_KEY = "chronos.user";

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

// ----- request: attach JWT -----
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ----- response: unwrap envelope, handle 401 -----
//
// Backend always responds with `{ success, message, data, ... }`. We unwrap
// `data` so callers can treat the resolved value as the actual payload.
api.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === "object" && "success" in body) {
      return { ...response, data: body.data, raw: body };
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired / invalid. Clear it. Routing will redirect.
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      // Hint to anything listening that auth state changed.
      window.dispatchEvent(new CustomEvent("chronos:logout"));
    }

    const message =
      error.response?.data?.message ||
      error.message ||
      "Request failed. Please try again.";
    error.userMessage = message;
    return Promise.reject(error);
  }
);

export default api;
