import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DEFAULT_ENTRY_ROUTE, LOGIN_ROUTE } from './router';
import { connector } from '@/library/powersync/ConnectionManager';
import { getTokenEndpoint } from '@/library/powersync/TokenConnector';
import { SyncClientImplementation } from '@powersync/web';
import { Spinner } from '@/components/ui/spinner';

export default function EntryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  React.useEffect(() => {
    if (searchParams.has('token')) {
      (async () => {
        const token = searchParams.get('token')!;
        const endpoint = getTokenEndpoint(token);
        if (endpoint == null) {
          throw new Error('endpoint is required');
        }

        await connector.signIn({
          token,
          endpoint,
          clientImplementation: SyncClientImplementation.RUST
        });

        navigate(DEFAULT_ENTRY_ROUTE);
      })();
    } else if (connector.hasCredentials()) {
      navigate(DEFAULT_ENTRY_ROUTE);
    } else {
      navigate(LOGIN_ROUTE);
    }
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    </div>
  );
}
