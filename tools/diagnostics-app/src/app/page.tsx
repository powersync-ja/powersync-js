import React from 'react';
import { CircularProgress, Grid, styled } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DEFAULT_ENTRY_ROUTE, LOGIN_ROUTE } from './router';
import { connector } from '@/library/powersync/ConnectionManager';
import { getTokenEndpoint } from '@/library/powersync/TokenConnector';
import { SyncClientImplementation } from '@powersync/web';

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
    <S.MainGrid container>
      <S.CenteredGrid item xs={12} md={6} lg={5}>
        <CircularProgress />
      </S.CenteredGrid>
    </S.MainGrid>
  );
}

namespace S {
  export const CenteredGrid = styled(Grid)`
    display: flex;
    justify-content: center;
    align-items: center;
  `;

  export const MainGrid = styled(CenteredGrid)`
    min-height: 100vh;
  `;
}
