import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setTokens, clearTokens, getTokens } from '../lib/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On first load, if we have a token, verify it's still valid and fetch
  // the current user rather than trusting stale localStorage state.
  useEffect(() => {
    async function bootstrap() {
      const { accessToken } = getTokens();
      if (!accessToken) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/api/auth/me');
        setUser(data.data.user);
      } catch (err) {
        clearTokens();
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  const register = useCallback(async ({ email, displayName, password }) => {
    const { data } = await api.post('/api/auth/register', { email, displayName, password });
    setTokens(data.data);
    setUser(data.data.user);
    return data.data.user;
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    setTokens(data.data);
    setUser(data.data.user);
    return data.data.user;
  }, []);

  const logout = useCallback(async () => {
    const { refreshToken } = getTokens();
    try {
      if (refreshToken) await api.post('/api/auth/logout', { refreshToken });
    } catch (err) {
      // Best-effort: even if the network call fails, clear local state so
      // the user isn't stuck "logged in" on their own device.
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
