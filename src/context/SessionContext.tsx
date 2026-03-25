import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { login, logout, restoreSession, signup, type AuthUser } from '../services/auth';
import { ApiError } from '../services/api';

type SessionContextValue = {
  booting: boolean;
  submitting: boolean;
  token: string | null;
  user: AuthUser | null;
  errorMessage: string | null;
  signIn: (payload: { username: string; password: string }) => Promise<boolean>;
  signUp: (payload: { username: string; email: string; password: string }) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [booting, setBooting] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const restored = await restoreSession();
        if (!mounted || !restored) {
          return;
        }

        setToken(restored.token);
        setUser(restored.user);
      } catch (error) {
        if (mounted) {
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (mounted) {
          setBooting(false);
        }
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  async function signIn(payload: { username: string; password: string }) {
    if (!payload.username.trim() || !payload.password.trim()) {
      setErrorMessage('Enter both username and password.');
      return false;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const auth = await login({
        username: payload.username.trim(),
        password: payload.password,
      });

      const restored = await restoreSession();
      setToken(auth.access_token);
      setUser(restored?.user ?? null);
      return true;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function signUp(payload: { username: string; email: string; password: string }) {
    if (!payload.username.trim() || !payload.email.trim() || !payload.password.trim()) {
      setErrorMessage('Enter username, email, and password.');
      return false;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const auth = await signup({
        username: payload.username.trim(),
        email: payload.email.trim(),
        password: payload.password,
      });

      const restored = await restoreSession();
      setToken(auth.access_token);
      setUser(restored?.user ?? null);
      return true;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function signOut() {
    await logout();
    setToken(null);
    setUser(null);
    setErrorMessage(null);
  }

  function clearError() {
    setErrorMessage(null);
  }

  return (
    <SessionContext.Provider
      value={{
        booting,
        submitting,
        token,
        user,
        errorMessage,
        signIn,
        signUp,
        signOut,
        clearError,
      }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const value = useContext(SessionContext);

  if (!value) {
    throw new Error('useSession must be used within SessionProvider');
  }

  return value;
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.detail;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong while talking to the backend.';
}
