import { createRoot } from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { RouterProvider } from 'react-router-dom';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { ConvexReactClient } from 'convex/react';
import { SystemProvider } from '../components/providers/SystemProvider';
import { ThemeProviderContainer } from '../components/providers/ThemeProviderContainer';
import { router } from './router';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

const root = createRoot(document.getElementById('app')!);
root.render(<App />);

export function App() {
  return (
    <ThemeProviderContainer>
      <CssBaseline />
      <ConvexAuthProvider client={convex}>
        <SystemProvider>
          <RouterProvider router={router} />
        </SystemProvider>
      </ConvexAuthProvider>
    </ThemeProviderContainer>
  );
}
