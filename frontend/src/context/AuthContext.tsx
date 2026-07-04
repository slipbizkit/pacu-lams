import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, UserRole } from '../types/user';

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

  return (
    <AuthContext.Provider
      value={{ token, user, role, isAuthenticated: !!token, login, setUser: setUserState, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
