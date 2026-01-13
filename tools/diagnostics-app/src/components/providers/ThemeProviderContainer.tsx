import React, { createContext, useContext, useEffect, useState } from 'react';

type SystemTheme = 'light' | 'dark';
type ThemeValue = SystemTheme | 'system';

type ThemeProviderState = {
  theme: ThemeValue;
  setTheme: (theme: ThemeValue) => void;
};

const STORAGE_KEY = 'powersync-diagnostics-theme';

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

function getSystemTheme(): SystemTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const ThemeProviderContainer: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeValue>(
    () => (localStorage.getItem(STORAGE_KEY) as ThemeValue) || 'dark'
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = getSystemTheme();
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: ThemeValue) => {
      localStorage.setItem(STORAGE_KEY, theme);
      setTheme(theme);
    }
  };

  return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProviderContainer');
  }
  return context;
};
