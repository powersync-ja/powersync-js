'use client';

import React from 'react';
import { CssBaseline } from '@mui/material';

import { ThemeProviderContainer } from '@/components/providers/ThemeProviderContainer';
import { DynamicSystemProvider } from '@/components/providers/DynamicSystemProvider';

import './globals.scss';
import 'lato-font';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>PowerSync Yjs CRDT Text Collaboration Demo</title>
      </head>
      <body>
        <CssBaseline />
        <ThemeProviderContainer>
          <DynamicSystemProvider>{children}</DynamicSystemProvider>
        </ThemeProviderContainer>
      </body>
    </html>
  );
}
