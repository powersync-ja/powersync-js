import React, { useEffect } from 'react';

export const ThemeProviderContainer: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.add('dark');
  }, []);

  return <>{children}</>;
};
