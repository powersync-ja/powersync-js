import React from 'react';
import type { Metadata } from 'next';
import { Rubik } from 'next/font/google';
import './globals.css';
import { ThemeProviderContainer } from '@/components/providers/ThemeProviderContainer';
import { DynamicSystemProvider } from '@/components/providers/DynamicSystemProvider';

const rubik = Rubik({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'PowerSync Demo',
  description: 'PowerSync Web SDK Demo'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#c44eff" />
        <link rel="apple-touch-icon" href="/icons/icon.png"></link>
      </head>
      <body className={rubik.className}>
        <ThemeProviderContainer>
          <DynamicSystemProvider>{children}</DynamicSystemProvider>
        </ThemeProviderContainer>
      </body>
    </html>
  );
}
