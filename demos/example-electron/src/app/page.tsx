import React from 'react';
import { CircularProgress, Grid, ListItem, styled } from '@mui/material';
import { usePowerSync, useQuery, useStatus } from '@powersync/react';

const EntryPage = () => {
  const db = usePowerSync();
  const status = useStatus();
  const { data: customers } = useQuery('SELECT id, name FROM customers');

  const addCustomer = () => {
    const names = ['Fred', 'Willard', 'Tina', 'Jake', 'Corey'];
    const name = names[Math.floor(Math.random() * names.length)];
    db.execute('INSERT INTO customers(id, name) VALUES(uuid(), ?)', [name]);
  };

  const deleteCustomers = () => {
    const names = ['Fred', 'Willard', 'Tina', 'Jake', 'Corey'];
    const name = names[Math.floor(Math.random() * names.length)];
    db.execute('DELETE FROM customers', [name]);
  };

  if (import.meta.env.VITE_POWERSYNC_URL && import.meta.env.VITE_PUBLIC_POWERSYNC_TOKEN && !status.hasSynced) {
    return (
      <S.MainGrid container>
        <CircularProgress />
      </S.MainGrid>
    );
  }

  return (
    <S.MainGrid container>
      <S.CenteredGrid>
        <div style={{ marginBottom: '12px' }}>
          <h1>Customers</h1>
          <div>
            <button
              style={{
                marginBottom: '12px',
                width: '140px',
                backgroundColor: 'green',
                color: 'white',
                border: 'none',
                padding: '6px',
                borderRadius: '12px'
              }}
              onClick={addCustomer}
            >
              Add Customer
            </button>
          </div>
          {customers.length > 0 && (
            <button
              style={{
                marginBottom: '6px',
                width: '140px',
                backgroundColor: 'red',
                color: 'white',
                border: 'none',
                padding: '6px',
                borderRadius: '12px'
              }}
              onClick={deleteCustomers}
            >
              Delete Customers
            </button>
          )}
        </div>
      </S.CenteredGrid>

      {customers.length === 0 ? (
        <S.CenteredGrid>
          <p>You currently have no customers. Please set them in the database or add them here.</p>
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
