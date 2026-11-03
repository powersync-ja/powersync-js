import React from 'react';
import { createRoot } from 'react-dom/client';
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import EntryPage from './page.jsx';
import SystemProvider from '../components/providers/SystemProvider.jsx';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#c44eff' },
    background: { default: '#0f0f14', paper: '#17171f' }
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  shape: { borderRadius: 12 }
});

const root = createRoot(document.getElementById('app')!);
root.render(<App />);

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SystemProvider>
        <EntryPage />
      </SystemProvider>
    </ThemeProvider>
  );
}
