import { createRootRoute, Outlet, Navigate } from '@tanstack/react-router';
import { SystemProvider } from '@/components/providers/SystemProvider';
import { ThemeProviderContainer } from '@/components/providers/ThemeProviderContainer';

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => <Navigate to="/" />
});

function RootComponent() {
  return (
    <ThemeProviderContainer>
      <SystemProvider>
        <Outlet />
      </SystemProvider>
    </ThemeProviderContainer>
  );
}
