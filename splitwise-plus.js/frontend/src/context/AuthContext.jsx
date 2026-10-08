import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api, { setAccessToken } from '../api/client.js';

const AuthContext = createContext(null);
const SESSION_KEY = 'splitwise-plus-session';
let sessionRestorePromise;

const hasPersistedSession = () => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(SESSION_KEY) === 'active';
};

const persistSession = (active) => {
  if (typeof window === 'undefined') return;

  if (active) {
    window.localStorage.setItem(SESSION_KEY, 'active');
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    if (!hasPersistedSession()) {
      setUser(null);
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    sessionRestorePromise ??= api.post('/auth/refresh')
      .then(({ data }) => {
        setAccessToken(data.data.accessToken);
        return data.data.user;
      })
      .catch(() => {
        persistSession(false);
        sessionRestorePromise = null;
        setAccessToken(null);
        return null;
      });

    sessionRestorePromise
      .then((restoredUser) => {
        if (isMounted) setUser(restoredUser);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo(() => ({
    user,
    isLoading,
    async register(details) {
      const { data } = await api.post('/auth/register', details);
      persistSession(true);
      setAccessToken(data.data.accessToken);
      setUser(data.data.user);
      return data.data.user;
    },
    async login(credentials) {
      const { data } = await api.post('/auth/login', credentials);
      persistSession(true);
      setAccessToken(data.data.accessToken);
      setUser(data.data.user);
      return data.data.user;
    },
    async logout() {
      try {
        await api.post('/auth/logout');
      } finally {
        persistSession(false);
        sessionRestorePromise = null;
        setAccessToken(null);
        setUser(null);
      }
    },
  }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}
