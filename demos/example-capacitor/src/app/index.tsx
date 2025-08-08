import { createRoot } from 'react-dom/client';

import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import SystemProvider from '../components/providers/SystemProvider.jsx';
import LogsPage from './LogsPage.jsx';
import EntryPage from './page.jsx';

const theme = createTheme({
  palette: {
    mode: 'dark'
  }
});

const root = createRoot(document.getElementById('app')!);
root.render(<App />);

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SystemProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<EntryPage />} />
            <Route path="/logs" element={<LogsPage />} />
          </Routes>
        </BrowserRouter>
      </SystemProvider>
    </ThemeProvider>
  );
}
