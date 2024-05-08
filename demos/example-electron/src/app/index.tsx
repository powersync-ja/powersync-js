import { createRoot } from 'react-dom/client';
import EntryPage from './page.jsx';
import SystemProvider from '../components/providers/SystemProvider.jsx';

const root = createRoot(document.getElementById('app')!);
root.render(<App />);

export function App() {
  return (
    <SystemProvider>
      <EntryPage />
    </SystemProvider>
  );
}
