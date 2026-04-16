import { createContext, useContext, useEffect, useState } from "react";
import { http } from "../api/http";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("portal_user");
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem("portal_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("portal_user");
    }
  }, [user]);

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
