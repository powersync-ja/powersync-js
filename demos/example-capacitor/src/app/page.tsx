import React from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  IconButton,
  InputAdornment,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  SvgIcon,
  TextField,
  Toolbar,
  Typography
} from '@mui/material';
import { usePowerSync, useQuery, useStatus } from '@powersync/react';

const PAGE_SIZE = 50;

const AddIcon = () => (
  <SvgIcon>
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" />
  </SvgIcon>
);

const DeleteIcon = () => (
  <SvgIcon fontSize="small">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z" />
  </SvgIcon>
);

const SearchIcon = () => (
  <SvgIcon fontSize="small">
    <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14" />
  </SvgIcon>
);

const SyncStatusChip = () => {
  const status = useStatus();

  if (status.downloadError || status.uploadError) {
    return <Chip size="small" color="error" label="Sync error" />;
  }
  if (status.connected) {
    return <Chip size="small" color="success" variant="outlined" label={status.uploading ? 'Uploading' : 'Online'} />;
  }
  if (status.connecting) {
    return <Chip size="small" color="warning" variant="outlined" label="Connecting" />;
  }
  return <Chip size="small" variant="outlined" label="Offline" />;
};

const initials = (name: string) =>
  name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const EntryPage = () => {
  const powerSync = usePowerSync();
  const status = useStatus();
  const [search, setSearch] = React.useState('');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [newName, setNewName] = React.useState('');

  const { data: totals } = useQuery<{ total: number }>('SELECT count(*) AS total FROM customers');
  const { data: customers } = useQuery<{ id: string; name: string; created_at: string }>(
    `SELECT id, name, created_at FROM customers WHERE name LIKE ? ORDER BY created_at DESC, name LIMIT ${PAGE_SIZE}`,
    [`%${search}%`]
  );

  const total = totals[0]?.total ?? 0;
  const isBackendConfigured = !!import.meta.env.VITE_POWERSYNC_URL;
  const progress = status.downloadProgress;

  const addCustomer = async () => {
    const name = newName.trim();
    if (!name) {
      return;
    }
    await powerSync.execute('INSERT INTO customers (id, name, created_at) VALUES (uuid(), ?, ?)', [
      name,
      new Date().toISOString()
    ]);
    setNewName('');
    setDialogOpen(false);
  };

  const deleteCustomer = (id: string) => powerSync.execute('DELETE FROM customers WHERE id = ?', [id]);

  return (
    <Box sx={{ minHeight: '100vh', pb: 'calc(96px + env(safe-area-inset-bottom))' }}>
      <AppBar position="sticky" elevation={0} sx={{ pt: 'env(safe-area-inset-top)', bgcolor: 'background.paper' }}>
        <Toolbar sx={{ gap: 1 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight={700}>
              Customers
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {total.toLocaleString()} synced locally
            </Typography>
          </Box>
          {isBackendConfigured ? <SyncStatusChip /> : <Chip size="small" variant="outlined" label="Local only" />}
        </Toolbar>
        {progress ? (
          <LinearProgress variant="determinate" value={progress.downloadedFraction * 100} />
        ) : (
          <Box sx={{ height: 4 }} />
        )}
      </AppBar>

      <Box sx={{ px: 2, pt: 2 }}>
        {!isBackendConfigured ? (
          <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
            No backend is set. Data stays on this device. See the README to run the local backend.
          </Typography>
        ) : null}

        <TextField
          fullWidth
          size="small"
          placeholder="Search customers"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />
      </Box>

      {isBackendConfigured && !status.hasSynced ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
          Syncing from the backend…
        </Typography>
      ) : customers.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
          {search ? 'No customers match your search.' : 'No customers yet. Add one with the + button.'}
        </Typography>
      ) : (
        <List>
          {customers.map((customer) => (
            <ListItem
              key={customer.id}
              divider
              secondaryAction={
                <IconButton edge="end" aria-label={`Delete ${customer.name}`} onClick={() => deleteCustomer(customer.id)}>
                  <DeleteIcon />
                </IconButton>
              }>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'primary.dark', fontSize: 14 }}>{initials(customer.name)}</Avatar>
              </ListItemAvatar>
              <ListItemText primary={customer.name} secondary={formatDate(customer.created_at)} />
            </ListItem>
          ))}
          {total > customers.length && !search ? (
            <Typography variant="caption" color="text.secondary" component="p" sx={{ p: 2, textAlign: 'center' }}>
              Showing the latest {customers.length} of {total.toLocaleString()}. Search to find others.
            </Typography>
          ) : null}
        </List>
      )}

      <Fab
        color="primary"
        aria-label="Add customer"
        onClick={() => setDialogOpen(true)}
        sx={{ position: 'fixed', right: 24, bottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
        <AddIcon />
      </Fab>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth>
        <DialogTitle>New customer</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Name"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                addCustomer();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={addCustomer} disabled={!newName.trim()}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EntryPage;
