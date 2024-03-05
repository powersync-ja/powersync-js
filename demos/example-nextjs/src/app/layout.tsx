'use client';

import React from 'react';
import { CssBaseline } from '@mui/material';

import { DynamicSystemProvider } from '@/components/providers/DynamicSystemProvider';

import './globals.scss';
import 'lato-font';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>PowerSync Next.js Example</title>
      </head>
      <body>
        <CssBaseline />
        <DynamicSystemProvider>{children}</DynamicSystemProvider>
      </body>
    </html>
  );
}
