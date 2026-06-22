import { RouterProvider } from 'react-router-dom';
import { AttachmentsProvider } from '@/components/providers/AttachmentsProvider';
import { SystemProvider } from '@/components/providers/SystemProvider';
import { ThemeProviderContainer } from '@/components/providers/ThemeProviderContainer';
import { router } from '@/app/router';

export function App() {
  return (
    <ThemeProviderContainer>
      <SystemProvider>
        <AttachmentsProvider>
          <RouterProvider router={router} />
        </AttachmentsProvider>
      </SystemProvider>
    </ThemeProviderContainer>
  );
}

