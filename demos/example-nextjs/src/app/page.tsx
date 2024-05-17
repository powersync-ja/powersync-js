'use client';

import { CircularProgress, Grid, ListItem, styled } from '@mui/material';
import { useQuery, useStatus } from '@powersync/react';

const EntryPage = () => {
  const status = useStatus();
  const { data: customers } = useQuery('SELECT id, name FROM customers');

  const areVariablesSet = process.env.NEXT_PUBLIC_POWERSYNC_URL && process.env.NEXT_PUBLIC_POWERSYNC_TOKEN;

  if (areVariablesSet && !status.hasSynced) {
    return (
      <S.MainGrid container>
        <p>
          Syncing down from the backend. This will load indefinitely if you have not set up the connection correctly. Check the console for issues.
        </p>
        <CircularProgress />
      </S.MainGrid>
    );
  }

  if (!areVariablesSet) {
    return (
      <S.CenteredGrid>
        <h4 style={{ color: 'red' }}>You have not set up a connection to the backend, please connect your backend.</h4>
      </S.CenteredGrid>
    );
  }

  return (
    <S.MainGrid container>
      <S.CenteredGrid>
        <h1>Customers</h1>
      </S.CenteredGrid>

      {customers.length === 0 ? (
        <S.CenteredGrid>
          <p>You currently have no customers. Please connect PowerSync to your database to see them sync down.</p>
        </S.CenteredGrid>
      ) : (
        <S.CenteredGrid item xs={12} md={6} lg={5}>
          <div>
            {customers.map((c) => (
              <ListItem key={c.id}>{c.name}</ListItem>
            ))}
            {customers.length == 0 ? <CircularProgress /> : []}
          </div>
        </S.CenteredGrid>
      )}
    </S.MainGrid>
  );
};


namespace S {
  export const CenteredGrid = styled(Grid)`
    display: flex;
    justify-content: center;
    align-items: center;
  `;

  export const MainGrid = styled(CenteredGrid)`
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  `;
}

export default EntryPage;
