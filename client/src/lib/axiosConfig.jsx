// lib/axiosConfig.js
import axios from "axios";
import NProgress from "nprogress";

// Base URL setup (Vite environment variable)
const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL || "https://homiqly-test-3av5.onrender.com",
});

let activeRequests = 0;

// Start NProgress
const startLoading = () => {
  if (typeof window === "undefined") return;
  if (activeRequests === 0) {
    NProgress.start();
  }
  activeRequests += 1;
};

// Stop NProgress
const stopLoading = () => {
  if (typeof window === "undefined") return;
  // avoid negative counts
  activeRequests = Math.max(0, activeRequests - 1);
  if (activeRequests === 0) {
    NProgress.done();
  }
};

// Helper: Get the correct token
// - supports both localStorage (remember-me) and sessionStorage (non-remember)
// - uses pathname to pick specific token when on role-specific routes
const getAuthToken = () => {
  if (typeof window === "undefined") return null;

  // read tokens from both storages (remember-me uses localStorage)
  const adminToken =
    localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
  const vendorToken =
    localStorage.getItem("vendorToken") || sessionStorage.getItem("vendorToken");
  const employeesToken =
    localStorage.getItem("employeesToken") ||
    sessionStorage.getItem("employeesToken");

  const pathname = window.location.pathname || "";

  // If we're on a role-specific route, prefer that role's token
  if (pathname.startsWith("/admin") && adminToken) return adminToken;
  if (pathname.startsWith("/vendor") && vendorToken) return vendorToken;
  if (pathname.startsWith("/employees") && employeesToken) return employeesToken;

  // Otherwise fall back to priority order: admin > vendor > employees
  if (adminToken) return adminToken;
  if (vendorToken) return vendorToken;
  if (employeesToken) return employeesToken;

  return null;
};

// Request interceptor: Add token
api.interceptors.request.use(
  (config) => {
    startLoading();

    try {
      const token = getAuthToken();

      if (token) {
        // ensure headers object exists
        if (!config.headers) config.headers = {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      // be defensive: don't break if storage is not accessible
      console.warn("Failed to attach auth token to request:", err);
    }

    return config;
  },
  (error) => {
    stopLoading();
    return Promise.reject(error);
  }
);

// Response interceptor: stop loading and basic 401 handling
api.interceptors.response.use(
  (response) => {
    stopLoading();
    return response;
  },
  (error) => {
    stopLoading();

    // handle unauthorized globally (optional)
    if (error?.response?.status === 401) {
      // token expired or invalid — you can dispatch logout here or emit an event
      console.warn("Unauthorized - token might be expired or missing");
      // Example (don't import auth here to avoid circular deps):
      // window.location.href = "/vendor/login";
    }

    return Promise.reject(error);
  }
);

export default api;
