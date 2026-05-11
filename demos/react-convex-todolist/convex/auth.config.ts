import type { AuthConfig } from 'convex/server';

const convexSiteUrl: string = process.env.CONVEX_SITE_URL ?? 'http://localhost:3211';

export default {
  providers: [
    {
      domain: convexSiteUrl,
      applicationID: 'convex'
    }
  ]
} satisfies AuthConfig;
