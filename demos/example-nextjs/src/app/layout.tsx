import type { Metadata } from 'next';
import { PowerSyncProvider } from '@/library/powersync/powersync-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'PowerSync Next.js Example'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <PowerSyncProvider>{children}</PowerSyncProvider>
      </body>
    </html>
  );
}
