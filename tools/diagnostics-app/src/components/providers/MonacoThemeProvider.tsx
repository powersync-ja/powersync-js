import { useEffect, useMemo, useState } from 'react';
import { useMonaco } from '@monaco-editor/react';
import '@/styles/monaco.css';

export const POWERSYNC_MONACO_THEME = 'powersync';

function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

const getTheme = (dark: boolean) => ({
  base: dark ? ('vs-dark' as const) : ('vs' as const),
  inherit: true,
  rules: [
    { token: '', background: dark ? '1f1f1f' : 'f8f9fa' },
    {
      token: '',
      background: dark ? '1f1f1f' : 'f8f9fa',
      foreground: dark ? 'd4d4d4' : '444444'
    },
    { token: 'string.sql', foreground: '24b47e' },
    { token: 'comment', foreground: '666666' },
    { token: 'predefined.sql', foreground: dark ? 'D4D4D4' : '444444' }
  ],
  colors: { 'editor.background': dark ? '#0F172BFF' : '#f8f9fa' }
});

export function MonacoThemeProvider() {
  const monaco = useMonaco();
  const [dark, setDark] = useState(isDarkMode);

  useEffect(() => {
    const observer = new MutationObserver(() => setDark(isDarkMode()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useMemo(() => {
    if (monaco) {
      monaco.editor.defineTheme(POWERSYNC_MONACO_THEME, getTheme(dark));
    }
  }, [dark, monaco]);

  return null;
}
