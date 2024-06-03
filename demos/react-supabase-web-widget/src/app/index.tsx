import SupabaseProvider from '@/components/providers/SupabaseProvider';
import { createRoot } from 'react-dom/client';

import Layout from './layout';
import Page from './page';

const root = createRoot(document.getElementById('app')!);
root.render(<App />);

export function App() {
  return (
    <Layout>
      <SupabaseProvider>
        <Page />
      </SupabaseProvider>
    </Layout>
  );
}
