import { router } from '@/app/router';
import { SystemProvider } from '@/components/providers/SystemProvider';
import { ThemeProviderContainer } from '@/components/providers/ThemeProviderContainer';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

const root = createRoot(document.getElementById('app')!);
root.render(<App />);

export function App() {
  return (
    <ThemeProviderContainer>
      <SystemProvider>
        <RouterProvider router={router} />
      </SystemProvider>
    </ThemeProviderContainer>
  );
}
