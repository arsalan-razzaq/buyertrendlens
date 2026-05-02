import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import http, { getErrorMessage, TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '../api/http';

export const AuthContext = createContext(null);

const googleAuthUrl = '/auth/google';
const isAuthFailure = (error) => [401, 403].includes(error?.response?.status);

const readStoredUser = () => {
  const rawUser = localStorage.getItem(USER_STORAGE_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const persistSession = useCallback((payload) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, payload.token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(payload.user));
    setUser(payload.user);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
  }, []);

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);

    if (!token) {
      setReady(true);
      return;
    }

    try {
      // Rehydrate the session from the API so wallet balance and role stay current after refresh.
      const { data } = await http.get('/auth/me');
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      setUser(data.user);
    } catch (error) {
      if (isAuthFailure(error)) {
        clearSession();
      }
    } finally {
      setReady(true);
    }
  }, [clearSession]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const login = useCallback(async (payload) => {
    setLoading(true);
    try {
      const { data } = await http.post('/auth/login', payload);
      persistSession(data);
      return data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [persistSession]);

  const startSignup = useCallback(async (payload) => {
    setLoading(true);
    try {
      const { data } = await http.post('/auth/signup/start', payload);
      return data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  const verifySignupOtp = useCallback(async (payload) => {
    setLoading(true);
    try {
      const { data } = await http.post('/auth/signup/verify', payload);
      persistSession(data);
      return data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [persistSession]);

  const googleLogin = useCallback(async (credential) => {
    setLoading(true);
    try {
      const { data } = await http.post(googleAuthUrl, { credential });
      if (data?.token && data?.user) {
        persistSession(data);
      }
      return data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [persistSession]);

  const completeGoogleSignup = useCallback(async (payload) => {
    setLoading(true);
    try {
      const { data } = await http.post('/auth/google/complete', payload);
      persistSession(data);
      return data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [persistSession]);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const refreshProfile = useCallback(async () => {
    const { data } = await http.get('/auth/me');
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      login,
      startSignup,
      verifySignupOtp,
      googleLogin,
      completeGoogleSignup,
      logout,
      refreshProfile
    }),
    [user, ready, loading, login, startSignup, verifySignupOtp, googleLogin, completeGoogleSignup, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
