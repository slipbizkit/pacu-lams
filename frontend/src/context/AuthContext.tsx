import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import type { User, UserRole } from '../types/user';
import { authService } from '../services/api';

// Access tokens live 60 minutes. While the user is active we silently reissue
// the token well before it expires so an in-progress task is never
// interrupted; if they go idle we stop, and the token expires on schedule.
const REFRESH_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const IDLE_LIMIT_MS = 10 * 60 * 1000;

interface DecodedToken {
  id: number;
  username: string;
  role: UserRole;
}

function decodeToken(token: string): DecodedToken | null {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

interface AuthContextValue {
  token: string | null;
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUserState] = useState<User | null>(null);
  const lastActivityRef = useRef(Date.now());
  const hasSessionRef = useRef(!!token);
  const navigate = useNavigate();

  const decoded = token ? decodeToken(token) : null;
  const role = user?.role ?? decoded?.role ?? null;

  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUserState(null);
  };

  useEffect(() => {
    const markActivity = () => {
      lastActivityRef.current = Date.now();
    };
    window.addEventListener('mousedown', markActivity);
    window.addEventListener('keydown', markActivity);
    window.addEventListener('scroll', markActivity, true);
    window.addEventListener('touchstart', markActivity);
    return () => {
      window.removeEventListener('mousedown', markActivity);
      window.removeEventListener('keydown', markActivity);
      window.removeEventListener('scroll', markActivity, true);
      window.removeEventListener('touchstart', markActivity);
    };
  }, []);

  useEffect(() => {
    hasSessionRef.current = !!token;
  }, [token]);

  // `user` (first/last name, etc.) isn't in the JWT payload and isn't
  // persisted — fetch it once whenever we have a token but no profile yet
  // (fresh login before any page populated it, or a reload/new tab that only
  // restored the token from localStorage).
  useEffect(() => {
    if (!token || user) return;
    authService.me().then(setUserState).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  useEffect(() => {
    function handleSessionExpired() {
      // Guard against duplicate handling when several in-flight requests all
      // 401 at once (e.g. a dashboard loading multiple endpoints in parallel).
      if (!hasSessionRef.current) return;
      hasSessionRef.current = false;
      logout();
      Swal.fire({
        icon: 'warning',
        title: 'Session expired',
        text: 'Please sign in again to continue.',
      });
      navigate('/login', { replace: true });
    }
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(async () => {
      if (Date.now() - lastActivityRef.current > IDLE_LIMIT_MS) return;
      try {
        const data = await authService.refresh();
        login(data.token);
      } catch {
        logout();
      }
    }, REFRESH_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <AuthContext.Provider
      value={{ token, user, role, isAuthenticated: !!token, login, setUser: setUserState, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
