import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { SystemProvider } from '@/components/providers/SystemProvider';
import { router } from '@/app/router';

export function App() {
  return (
    <SystemProvider>
      <RouterProvider router={router} />
    </SystemProvider>
  );
}

const root = createRoot(document.getElementById('app')!);
root.render(<App />);
