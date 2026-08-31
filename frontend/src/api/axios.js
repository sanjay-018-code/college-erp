import axios from "axios";

// CHANGE_ME: set VITE_API_BASE_URL in frontend/.env for production
// (e.g. https://erp.yourcollege.edu/api). Defaults to same-origin /api,
// which works when Nginx proxies /api to the Django backend.
const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- Global error reporting -------------------------------------------------
// Lets any failed request surface a toast automatically, even if the calling
// page doesn't explicitly catch it. Pages that already render an inline
// validation error (e.g. a create/edit form) pass `{ skipGlobalErrorToast: true }`
// in the request config to avoid showing the same error twice.
let globalErrorHandler = null;
export function registerGlobalErrorHandler(fn) {
  globalErrorHandler = fn;
}

let isRefreshing = false;
let queue = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const reportUnlessSuppressed = () => {
      if (!originalRequest.skipGlobalErrorToast && globalErrorHandler) {
        globalErrorHandler(error);
      }
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) {
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(error);
      }
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const { data } = await axios.post(`${baseURL}/auth/token/refresh/`, { refresh: refreshToken });
        localStorage.setItem("access_token", data.access);
        queue.forEach((p) => p.resolve(data.access));
        queue = [];
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return api(originalRequest);
      } catch (refreshError) {
        queue.forEach((p) => p.reject(refreshError));
        queue = [];
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    // 401s with no/failed refresh already redirect to /login above; everything
    // else (network errors, 403/404/422/500, etc.) gets reported here.
    if (error.response?.status !== 401) {
      reportUnlessSuppressed();
    }
    return Promise.reject(error);
  }
);

export default api;
