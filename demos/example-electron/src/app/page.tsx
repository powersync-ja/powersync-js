import React from 'react';
import { CircularProgress, Grid, ListItem, styled } from '@mui/material';
import { usePowerSync, useQuery, useStatus } from '@powersync/react';

const EntryPage = () => {
  const db = usePowerSync();
  const status = useStatus();
  const { data: customers } = useQuery('SELECT id, name FROM customers');

  const addCustomer = async () => {
    const names = ['Fred', 'Willard', 'Tina', 'Jake', 'Corey'];
    const name = names[Math.floor(Math.random() * names.length)];
    await db.execute('INSERT INTO customers(id, name) VALUES(uuid(), ?)', [name]);
  };

  const deleteCustomers = async () => {
    await db.execute('DELETE FROM customers');
  };

  const areVariablesSet = import.meta.env.VITE_POWERSYNC_URL && import.meta.env.VITE_PUBLIC_POWERSYNC_TOKEN;

  if (areVariablesSet && !status.hasSynced) {
    return (
      <S.MainGrid container>
        <CircularProgress />
      </S.MainGrid>
    );
  }

  return (
    <S.MainGrid container>
      {!areVariablesSet && (
        <S.CenteredGrid>
          <h4 style={{ color: 'red' }}>
            You have not set up a connection to the backend, this will only sync to the local database.
          </h4>
        </S.CenteredGrid>
      )}
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
