import { StrictMode, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { createDatabase } from './database';
import { PowerSyncContext } from '@powersync/react';

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true
});

const db = createDatabase();

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function App() {
  return (
    <PowerSyncContext.Provider value={db}>
      <RouterProvider router={router} />
    </PowerSyncContext.Provider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
