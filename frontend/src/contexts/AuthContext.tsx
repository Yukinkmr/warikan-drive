"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { authApi, AUTH_TOKEN_STORAGE_KEY, clearStoredAuth } from "@/lib/api";
import type { AuthResponse, AuthUser } from "@/types";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

function storeSession(session: AuthResponse) {
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, session.token);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (!token) {
      queueMicrotask(() => setLoading(false));
      return;
    }

    authApi
      .me()
      .then((me) => setUser(me))
      .catch(() => {
        clearStoredAuth();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const session = await authApi.login({ email, password });
    storeSession(session);
    setUser(session.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const session = await authApi.register({ name, email, password });
    storeSession(session);
    setUser(session.user);
  };

  const logout = () => {
    clearStoredAuth();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
