import { router } from '@/app/router';
import { SystemProvider } from '@/components/providers/SystemProvider';
import { ThemeProviderContainer } from '@/components/providers/ThemeProviderContainer';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

const root = createRoot(document.getElementById('app')!);
root.render(<App />);

export function App() {
  return (
    <React.StrictMode>
      <ThemeProviderContainer>
        <SystemProvider>
          <RouterProvider router={router} />
        </SystemProvider>
      </ThemeProviderContainer>
    </React.StrictMode>
  );
}
