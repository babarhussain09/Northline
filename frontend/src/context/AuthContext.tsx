import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setAccessToken, unwrap } from '../api/client';
import type { User } from '../types';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    const next = await unwrap<User>(api.get('/auth/me'));
    setUser(next);
  }

  useEffect(() => {
    let active = true;
    api
      .post('/auth/refresh')
      .then(async (response) => {
        setAccessToken(response.data.data.accessToken);
        const next = await unwrap<User>(api.get('/auth/me'));
        if (active) setUser(next);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const onLogout = () => setUser(null);
    window.addEventListener('auth:logout', onLogout);
    return () => {
      active = false;
      window.removeEventListener('auth:logout', onLogout);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      refreshUser,
      async login(email, password) {
        const response = await api.post('/auth/login', { email, password });
        setAccessToken(response.data.data.accessToken);
        const next = await unwrap<User>(api.get('/auth/me'));
        setUser(next);
        return next;
      },
      async logout() {
        try {
          await api.post('/auth/logout');
        } finally {
          setAccessToken(null);
          setUser(null);
        }
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
