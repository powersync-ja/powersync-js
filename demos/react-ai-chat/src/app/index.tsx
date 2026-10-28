import '@fontsource-variable/figtree';
import '@fontsource-variable/jetbrains-mono';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { SystemProvider } from '@/components/providers/SystemProvider';
import { router } from '@/app/router';

createRoot(document.getElementById('app')!).render(
  <SystemProvider>
    <RouterProvider router={router} />
  </SystemProvider>
);
