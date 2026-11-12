import { useCallback, useEffect, useMemo, useState } from 'react';
import api, { getApiErrorMessage, refreshCsrfToken } from '../services/api';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const [sessionError, setSessionError] = useState('');

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        await refreshCsrfToken();
        const { data } = await api.get('/auth/me');
        if (active) {
          setUser(data.user);
          setSessionError('');
        }
      } catch (error) {
        if (active) {
          setUser(null);
          if (error?.response?.status !== 401) {
            setSessionError(getApiErrorMessage(error, 'Unable to verify your session.'));
          }
        }
      } finally {
        if (active) setStatus('ready');
      }
    }

    restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const signup = useCallback(async (values) => {
    await refreshCsrfToken(true);
    const { data } = await api.post('/auth/register', values);
    setUser(data.user);
    setSessionError('');
    return data;
  }, []);

  const login = useCallback(async (values) => {
    await refreshCsrfToken(true);
    const { data } = await api.post('/auth/login', values);
    setUser(data.user);
    setSessionError('');
    return data;
  }, []);

  const logout = useCallback(async () => {
    await refreshCsrfToken(true);
    const { data } = await api.post('/auth/logout');
    setUser(null);
    return data;
  }, []);

  const updateCyclePreferences = useCallback(async (preferences) => {
    await refreshCsrfToken(true);
    const { data } = await api.patch('/auth/preferences', preferences);
    setUser(data.user);
    return data;
  }, []);

  const updateProfile = useCallback(async (profile) => {
    const { data } = await api.patch('/users/me', profile);
    setUser(data.user);
    return data.user;
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setStatus('ready');
    setSessionError('');
  }, []);

  const value = useMemo(() => ({
    user,
    status,
    sessionError,
    signup,
    login,
    logout,
    updateCyclePreferences,
    updateProfile,
    clearSession,
  }), [user, status, sessionError, signup, login, logout, updateCyclePreferences, updateProfile, clearSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
