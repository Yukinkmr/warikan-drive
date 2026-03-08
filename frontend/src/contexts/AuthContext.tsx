"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { authApi, AUTH_TOKEN_STORAGE_KEY, clearStoredAuth } from "@/lib/api";
import type { AuthResponse, AuthUser } from "@/types";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogleCode: (code: string, redirectUri: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  loginWithGoogleCode: async () => {},
  register: async () => {},
  logout: () => {},
  refreshUser: async () => {},
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

  const loginWithGoogleCode = async (code: string, redirectUri: string) => {
    const session = await authApi.googleLogin({ code, redirect_uri: redirectUri });
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

  const refreshUser = async () => {
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (!token) return;
    const me = await authApi.me();
    setUser(me);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogleCode, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
