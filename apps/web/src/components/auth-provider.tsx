'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiJson, ensureCsrf } from '@/lib/api';

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
};

const AuthContext = createContext<{
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
}>({ user: null, loading: true, refresh: async () => undefined });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      await ensureCsrf();
      const data = await apiJson<{ user: SessionUser }>('/api/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return <AuthContext.Provider value={{ user, loading, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
