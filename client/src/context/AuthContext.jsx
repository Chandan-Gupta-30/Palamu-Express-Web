import { createContext, useContext, useEffect, useRef, useState } from "react";
import { http } from "../api/http";
import { io } from "socket.io-client";
import { runtimeConfig } from "../config/runtime";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("portal_user");
    return raw ? JSON.parse(raw) : null;
  });
  const socketRef = useRef(null);

  useEffect(() => {
    if (user) {
      localStorage.setItem("portal_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("portal_user");
    }
  }, [user]);

  useEffect(() => {
    const token = localStorage.getItem("portal_token");

    if (!user || !token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return undefined;
    }

    const socket = io(runtimeConfig.socketUrl, {
      auth: { token },
    });

    socketRef.current = socket;
    socket.on("user:access-updated", async (payload) => {
      if (!payload?.userId || payload.userId !== user._id) return;

      try {
        const { data } = await http.get("/users/me");
        setUser(data.user);
      } catch (_) {
        // Keep the current session if the refresh request fails temporarily.
      }
    });

    return () => {
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [user?._id]);

  const value = {
    user,
    setSession: ({ token, user: currentUser }) => {
      localStorage.setItem("portal_token", token);
      setUser(currentUser);
    },
    logout: () => {
      localStorage.removeItem("portal_token");
      setUser(null);
    },
    refreshUser: async () => {
      const { data } = await http.get("/users/me");
      setUser(data.user);
      return data.user;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
