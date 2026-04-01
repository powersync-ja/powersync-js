import type { NextConfig } from 'next';

const config: NextConfig = {
  images: {
    disableStaticImages: true
  },
  serverExternalPackages: ['pg', 'jose'],
  turbopack: {
    root: __dirname
  }
};

export default config;
