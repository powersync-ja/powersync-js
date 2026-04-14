import type { NextConfig } from 'next';

const config: NextConfig = {
  serverExternalPackages: ['pg', 'jose'],
  turbopack: {
    root: import.meta.dirname
  }
};

export default config;
