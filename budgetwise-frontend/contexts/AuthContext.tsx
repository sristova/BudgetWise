import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import axios from 'axios';
import { authApi, tokenStorage, BASE_URL } from '@/lib/api';


// ─── Types 

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  currency: string;
  timezone?: string;
  locale?: string;
  isEmailVerified: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface AuthState {
  /** Null while session is being restored from SecureStore */
  user: User | null;
  /** True once the initial restore check is complete */
  isReady: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  currency?: string;
}

type AuthContextValue = AuthState & AuthActions;

// ─── Context 

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider 

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prevent double-restore on strict mode / fast refresh
  const restoreAttempted = useRef(false);

  // ── Restore session on cold start 
  useEffect(() => {
    if (restoreAttempted.current) return;
    restoreAttempted.current = true;

    (async () => {
      try {
        const storedRefresh = await tokenStorage.getRefresh();
        if (!storedRefresh) {
          setUser(null);
          setIsReady(true);
          return;
        }

        // Refresh najprej → dobimo svež access token
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken: storedRefresh,
        });
        const { accessToken, refreshToken: newRefresh } = data.data;
        await tokenStorage.save(accessToken, newRefresh);

        // Zdaj pokliči /me z svežim tokenom
        const me = await authApi.me();
        setUser(me);
      } catch {
        console.log('⚠️ Seja potečena ali neveljavna. Čistim podatke...');
        await tokenStorage.clear();
        setUser(null);
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  // ── Login 
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const loggedInUser = await authApi.login(email, password);
      setUser(loggedInUser);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.message ?? 'Login failed. Please try again.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Register 
  const register = useCallback(async (data: RegisterData) => {
    setIsLoading(true);
    setError(null);
    try {
      const newUser = await authApi.register(data);
      setUser(newUser);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.message ?? 'Registration failed. Please try again.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Logout 
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } catch {
      // Even if the server call fails, clear local state
    } finally {
      await tokenStorage.clear(); // Za vsak slučaj počistimo še storage
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  // ── Refresh current user data 
  const refreshUser = useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser(me);
    } catch {
      /* silent */
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value: AuthContextValue = {
    user,
    isReady,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook 

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}