import { useState, useEffect } from 'react';

const API = "http://localhost:3001";

export function useAuth() {
  const [username, setUsername] = useState("test");
  const [password, setPassword] = useState("pass123");
  // sessionStorage is tab-scoped, localStorage is not
  const initialToken = (typeof window !== 'undefined' ? (sessionStorage.getItem('token') || localStorage.getItem('token') || '') : '');
  const [token, setToken] = useState(initialToken);
  const [showAuth, setShowAuth] = useState(!initialToken);
  const initialRemember = (typeof window !== 'undefined') ? !!(localStorage.getItem('token') && !sessionStorage.getItem('token')) : false;
  const [rememberMe, setRememberMe] = useState<boolean>(initialRemember);

  useEffect(() => {
    if (token) {
      setShowAuth(false);
    }
  }, [token]);

  const login = async () => {
    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!data.token) {
        throw new Error("Login failed");
      }
      // Store token in sessionStorage by default, or localStorage if rememberMe is checked
      try {
        sessionStorage.setItem('token', data.token);
      } catch {}
      try {
        // If rememberMe, store in localStorage otherwise ensure it's cleared
        if (rememberMe) {
          localStorage.setItem('token', data.token);
        } else {
          localStorage.removeItem('token');
        }
      } catch {}
      setToken(data.token);
      return data.token;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const signup = async () => {
    try {
      const res = await fetch(`${API}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        return true;
      } else {
        const error = await res.json();
        throw new Error(error.error || "Signup failed");
      }
    } catch (error) {
      console.error("Signup failed:", error);
      throw error;
    }
  };

  const logout = () => {
    try { localStorage.removeItem('token'); } catch {}
    try { sessionStorage.removeItem('token'); } catch {}
    setToken("");
    setShowAuth(true);
    setRememberMe(false);
  };

  return {
    username,
    password,
    token,
    showAuth,
    rememberMe,
    setUsername,
    setPassword,
    setRememberMe,
    login,
    signup,
    logout
  };
}
