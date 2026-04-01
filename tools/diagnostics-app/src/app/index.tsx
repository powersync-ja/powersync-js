import { createRoot } from 'react-dom/client';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { routeTree } from '../routeTree.gen';

// Read the base path injected by the Docker entrypoint (or empty string for root).
const basepath = (window as any).__DIAG_BASE__ || '/';

// Create the router instance
const router = createRouter({
  routeTree,
  basepath,
  defaultPreload: 'intent',
  defaultPendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    </div>
  )
});

// Register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const root = createRoot(document.getElementById('app')!);
root.render(<RouterProvider router={router} />);
