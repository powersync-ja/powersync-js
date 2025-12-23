import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { StrictMode, useEffect } from 'react';

import { PowerSyncContext } from '@powersync/react';
import { connectPowerSync, neonConnector, powersync } from '@/lib/powersync';

// Import the generated route tree
import { routeTree } from './routeTree.gen';

// Create a new router instance
const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  context: {
    accessToken: null
  }
});

// Create a client
const queryClient = new QueryClient();

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function App() {
  return (
    <StrictMode>
      <PowerSyncContext.Provider value={powersync}>
        <QueryClientProvider client={queryClient}>
          <PowerSyncAuthBridge />
          <RouterWithAuth />
        </QueryClientProvider>
      </PowerSyncContext.Provider>
    </StrictMode>
  );
}

function PowerSyncAuthBridge() {
  useEffect(() => {
    // Initialize the connector and PowerSync
    const initConnector = async () => {
      await powersync.init();
      await neonConnector.init();

      // Expose for console debugging
      (window as any).powersync = powersync;
    };

    // Listen for session changes
    const unsubscribe = neonConnector.registerListener({
      initialized: () => {
        // If already have a session after init, connect PowerSync
        if (neonConnector.currentSession) {
          connectPowerSync();
        }
      },
      sessionStarted: () => {
        connectPowerSync();
      }
    });

    initConnector();

    return () => {
      unsubscribe?.();
    };
  }, []);

  return null;
}

function RouterWithAuth() {
  return <RouterProvider router={router} />;
}

export default App;
