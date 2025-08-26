import { Button, ButtonGroup, CircularProgress, Grid, ListItem, Paper, styled } from '@mui/material';
import { usePowerSync, useQuery, useStatus } from '@powersync/react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import LocalEditWidget from '../components/LocalEditWidget.js';
import { Customer } from '../library/powersync/AppSchema.js';
import { BackendConnector } from '../library/powersync/BackendConnector.js';

const CustomersWidget: React.FC<{ customers: Customer[] }> = (props) => {
  const { customers } = props;
  return (
    <Grid item>
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
    </Grid>
  );
};

const EntryPage = () => {
  const status = useStatus();
  const powerSync = usePowerSync();

  const { data: customers } = useQuery<Customer>('SELECT id, name FROM customers');
  const navigate = useNavigate();

  const areVariablesSet = import.meta.env.VITE_POWERSYNC_URL && import.meta.env.VITE_PUBLIC_POWERSYNC_TOKEN;

  return (
    <Grid container padding="30px">
      <S.FlexGrid item xs={12} alignItems={'end'}>
        <ButtonGroup>
          <Button
            disabled={status.connected || status.connecting}
            onClick={() => powerSync.connect(new BackendConnector())}>
            Connect
          </Button>
          <Button disabled={!status.connected && !status.connecting} onClick={() => powerSync.disconnect()}>
            Disconnect
          </Button>
          <Button variant="outlined" color="primary" onClick={() => navigate('/logs')}>
            View Logs
          </Button>
        </ButtonGroup>
      </S.FlexGrid>

      <S.CenteredGrid xs={12}>
        <Paper sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }} elevation={1}>
          {areVariablesSet && !status.hasSynced && (
            <>
              <p>
                Syncing down from the backend. This will load indefinitely if you have not set the connection up
                correctly.
              </p>
              <CircularProgress />
            </>
          )}
          {!areVariablesSet && (
            <h4 style={{ color: 'red' }}>
              You have not set up a connection to the backend, please connect your backend.
            </h4>
          )}
          {areVariablesSet && status.hasSynced && <CustomersWidget customers={customers} />}
        </Paper>
      </S.CenteredGrid>

      <S.CenteredGrid xs={12}>
        <LocalEditWidget />
      </S.CenteredGrid>
    </Grid>
  );
};

namespace S {
  export const FlexGrid = styled(Grid)`
    display: flex;
    flex-direction: column;
    margin: 10px;
  `;

  export const CenteredGrid = styled(FlexGrid)`
    justify-content: center;
    align-items: center;
  `;
}

export default EntryPage;
