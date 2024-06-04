import { createIX2Engine, InteractionsProvider } from '@/devlink';
import React from 'react';
import '@/devlink/global.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <InteractionsProvider createEngine={createIX2Engine}>{children}</InteractionsProvider>;
}
