import { useState, useEffect } from 'react';

const API = "http://localhost:3001";

export function useAuth() {
  const [username, setUsername] = useState("test");
  const [password, setPassword] = useState("pass123");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [showAuth, setShowAuth] = useState(!localStorage.getItem("token"));

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
      localStorage.setItem("token", data.token);
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
    localStorage.removeItem("token");
    setToken("");
    setShowAuth(true);
  };

  return {
    username,
    password,
    token,
    showAuth,
    setUsername,
    setPassword,
    login,
    signup,
    logout
  };
}
