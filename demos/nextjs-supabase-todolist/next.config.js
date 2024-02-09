const { default: _withPWA } = require('@ducanh2912/next-pwa');
const withPWA = _withPWA({
  dest: 'public',
  cacheStartUrl: true,
  dynamicStartUrl: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === 'development',
  customWorkerSrc: 'service-worker',
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    // These caching rules extend the default rules from `next-pwa`
    runtimeCaching: [
      {
        urlPattern: ({ request, url: { pathname }, sameOrigin }) =>
          '1' === request.headers.get('RSC') && sameOrigin && !pathname.startsWith('/api/'),
        // Caching server-side rendering caused a lot of bugs, this app uses only client side rendering and navigation
        handler: 'NetworkOnly',
        options: {
          cacheName: 'pages-rsc',
          plugins: []
        }
      },
      {
        urlPattern: ({ url: { pathname }, sameOrigin }) => sameOrigin && pathname.startsWith('/views/'),
        handler: 'NetworkFirst',
        options: {
          cacheName: 'views',
          plugins: [
            {
              cacheKeyWillBeUsed: ({ request, mode }) => {
                const url = new URL(request.url || request);
                if (url.pathname.includes('/todo-lists/edit')) {
                  // The page content is the same for any todo list. The todo is fetched dynamically
                  url.searchParams.delete('id');
                }
                return url.href;
              }
            }
          ]
        }
      }
    ]
  }
});

/** @type {import('next').NextConfig} */
const nextConfig = withPWA({
  reactStrictMode: false
});

module.exports = nextConfig;
