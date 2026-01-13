'use client';

import { SystemProvider } from '@/components/providers/SystemProvider';
import { CssBaseline } from '@mui/material';
import React from 'react';

import 'lato-font';
import './globals.scss';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>PowerSync Next.js Example</title>
      </head>
      <body>
        <CssBaseline />
        <SystemProvider>{children}</SystemProvider>
      </body>
    </html>
  );
}
