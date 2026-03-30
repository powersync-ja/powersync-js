'use client';

import { PowerSyncProvider } from '@/lib/powersync/powersync-provider';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: '#0a0a0a', paper: '#161616' },
    primary: { main: '#00d5ff' },
    success: { main: '#22c55e' },
    warning: { main: '#f59e0b' },
    error: { main: '#ef4444' },
    divider: '#282828',
    text: { primary: '#e8e8e8', secondary: '#888' }
  },
  shape: { borderRadius: 10 },
  typography: { fontFamily: 'Inter, system-ui, sans-serif' }
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PowerSyncProvider>{children}</PowerSyncProvider>
    </ThemeProvider>
  );
}
