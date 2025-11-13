import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { requestFCMToken } from "../../firebase/firebase";
import api from "../../lib/axiosConfig";

const VendorAuthContext = createContext();

export const useVendorAuth = () => useContext(VendorAuthContext);

export const VendorAuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fcmToken, setFcmToken] = useState("");

  useEffect(() => {
    // Check both storages on mount: localStorage (remembered) first, then sessionStorage
    const token =
      localStorage.getItem("vendorToken") ||
      sessionStorage.getItem("vendorToken");
    const userData =
      localStorage.getItem("vendorData") ||
      sessionStorage.getItem("vendorData");

    if (token && userData) {
      try {
        setCurrentUser(JSON.parse(userData));
        setIsAuthenticated(true);
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      } catch (err) {
        // in case parsing fails, clear bad data
        localStorage.removeItem("vendorData");
        sessionStorage.removeItem("vendorData");
        localStorage.removeItem("vendorToken");
        sessionStorage.removeItem("vendorToken");
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    requestFCMToken().then((token) => {
      if (token) setFcmToken(token);
    });
  }, []);

  /**
   * login(email, password, remember)
   * if remember === true -> store token & userData in localStorage (persists)
   * if remember === false -> store token & userData in sessionStorage (cleared on tab close)
   */
  const login = async (email, password, remember = true) => {
    try {
      setError(null);

      const response = await api.post("/api/vendor/login", {
        email,
        password,
        fcmToken, // using state
      });

      const { token, vendor_id, vendor_type, name, role } = response.data;

      const userData = { vendor_id, vendor_type, name, role };

      // store token & userData based on remember flag
      if (remember) {
        localStorage.setItem("vendorToken", token);
        localStorage.setItem("vendorData", JSON.stringify(userData));
        // ensure session storage cleared to avoid dual source confusion
        sessionStorage.removeItem("vendorToken");
        sessionStorage.removeItem("vendorData");
      } else {
        sessionStorage.setItem("vendorToken", token);
        sessionStorage.setItem("vendorData", JSON.stringify(userData));
        // ensure local storage cleared to avoid dual source confusion
        localStorage.removeItem("vendorToken");
        localStorage.removeItem("vendorData");
      }

      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      setCurrentUser(userData);
      setIsAuthenticated(true);

      return { success: true };
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
      return {
        success: false,
        error: err.response?.data?.error || "Login failed",
      };
    }
  };

  const register = async (formData) => {
    try {
      setError(null);
      const response = await api.post("/api/vendor/register", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
      return {
        success: false,
        error: err.response?.data?.error || "Registration failed",
      };
    }
  };

  const logout = () => {
    // clear both storages
    localStorage.removeItem("vendorToken");
    localStorage.removeItem("vendorData");
    sessionStorage.removeItem("vendorToken");
    sessionStorage.removeItem("vendorData");
    delete axios.defaults.headers.common["Authorization"];
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const requestPasswordReset = async (email) => {
    try {
      setError(null);
      await api.post("/api/vendor/requestreset", { email });
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send reset code");
      return {
        success: false,
        error: err.response?.data?.error || "Failed to send reset code",
      };
    }
  };

  const verifyResetCode = async (email, resetCode) => {
    try {
      setError(null);
      const response = await api.post("/api/vendor/verifyresetcode", {
        email,
        resetCode,
      });
      return { success: true, token: response.data.token };
    } catch (err) {
      setError(err.response?.data?.error || "Invalid code");
      return {
        success: false,
        error: err.response?.data?.error || "Invalid code",
      };
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      setError(null);
      await api.post(
        "/api/vendor/resetpassword",
        { newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset password");
      return {
        success: false,
        error: err.response?.data?.error || "Failed to reset password",
      };
    }
  };

  const value = {
    currentUser,
    setCurrentUser,
    isAuthenticated,
    loading,
    error,
    login,
    register,
    logout,
    requestPasswordReset,
    verifyResetCode,
    resetPassword,
  };

  return (
    <VendorAuthContext.Provider value={value}>
      {children}
    </VendorAuthContext.Provider>
  );
};
