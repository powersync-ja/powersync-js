import { CssBaseline } from '@mui/material';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { SystemProvider } from '../components/providers/SystemProvider';
import { ThemeProviderContainer } from '../components/providers/ThemeProviderContainer';
import { router } from './router';

import 'lato-font';
import './globals.css';

const root = createRoot(document.getElementById('app')!);
root.render(<App />);

export function App() {
  return (
    <>
      <CssBaseline />
      <ThemeProviderContainer>
        <SystemProvider>
          <RouterProvider router={router} />
        </SystemProvider>
      </ThemeProviderContainer>
    </>
  );
}
