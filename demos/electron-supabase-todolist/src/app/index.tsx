import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { SystemProvider } from '../../../react-supabase-todolist/src/components/providers/SystemProvider.jsx';
import { ThemeProviderContainer } from '../../../react-supabase-todolist/src/components/providers/ThemeProviderContainer.jsx';
import { router } from '../../../react-supabase-todolist/src/app/router.jsx';

const root = createRoot(document.getElementById('app')!);
root.render(<App />);

// This is using the application found in the react-supabase-todolist folder
export function App() {
  return (
    <ThemeProviderContainer>
      <SystemProvider>
        <RouterProvider router={router} />
      </SystemProvider>
    </ThemeProviderContainer>
  );
}
