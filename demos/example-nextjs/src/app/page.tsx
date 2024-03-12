'use client';

import React, { useEffect } from 'react';
import { CircularProgress, Grid, ListItem, styled } from '@mui/material';
import { useRouter } from 'next/navigation';
import { usePowerSync, usePowerSyncWatchedQuery } from '@journeyapps/powersync-react';

export default function EntryPage() {
  const router = useRouter();
  const db = usePowerSync();
  const customers = usePowerSyncWatchedQuery('SELECT id, name FROM customers');

  useEffect(() => {
    // Insert some test data
    const names = ['Fred', 'Willard', 'Tina', 'Jake', 'Corey'];
    const name = names[Math.floor(Math.random() * names.length)];
    db.execute('INSERT INTO customers(id, name) VALUES(uuid(), ?)', [name]);
    return () => { };
  }, []);

  return (
    <S.MainGrid container>
      <S.CenteredGrid item xs={12} md={6} lg={5}>
        <div>
          <h1>Customers</h1>
          {
            customers.map(c =>
              <ListItem key={c.id}>{c.name}</ListItem>
            )
          }
          {customers.length == 0 ? <CircularProgress /> : []}

        </div>
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
