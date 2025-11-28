'use client';

import { createContext, useContext, useEffect, useMemo } from 'react';

type Theme = 'dark';

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  systemTheme: Theme;
};

const STORAGE_KEY = 'atlas-360-theme';
const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
  systemTheme: 'dark',
});

const applyTheme = () => {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add('dark');
  root.style.colorScheme = 'dark';
  root.setAttribute('data-theme', 'dark');

  const body = document.body;
  if (body) {
    body.classList.remove('theme-light', 'theme-dark');
    body.classList.add('theme-dark');
  }
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyTheme();
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, 'dark');
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: 'dark',
      setTheme: () => {},
      toggleTheme: () => {},
      systemTheme: 'dark',
    }),
    []
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
