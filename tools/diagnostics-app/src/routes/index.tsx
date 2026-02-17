import { createFileRoute, redirect } from '@tanstack/react-router';
import { connector } from '@/library/powersync/ConnectionManager';
import { getTokenEndpoint } from '@/library/powersync/TokenConnector';
import { SyncClientImplementation } from '@powersync/web';
import { z } from 'zod';

const searchSchema = z.object({
  token: z.string().optional()
});

export const Route = createFileRoute('/')({
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    if (search.token) {
      const endpoint = getTokenEndpoint(search.token);
      if (!endpoint) {
        throw new Error('endpoint is required');
      }

      await connector.signIn({
        token: search.token,
        endpoint,
        clientImplementation: SyncClientImplementation.RUST
      });

      throw redirect({ to: '/sync-diagnostics' });
    } else if (await connector.hasCredentials()) {
      throw redirect({ to: '/sync-diagnostics' });
    } else {
      throw redirect({ to: '/login' });
    }
  }
});
