import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type Theme = 'light' | 'soft-light' | 'dark';

const STORAGE_KEY = 'pacu-theme';
const THEMES: Theme[] = ['light', 'soft-light', 'dark'];

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  return (THEMES as string[]).includes(stored ?? '') ? (stored as Theme) : 'light';
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>(null!);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (next: Theme) => setThemeState(next);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
