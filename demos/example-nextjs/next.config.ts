import type { NextConfig } from 'next';

const config: NextConfig = {
  images: {
    disableStaticImages: true
  },
  serverExternalPackages: ['pg', 'jose'],
  turbopack: {}
};

export default config;
