'use client';

import type { Customer } from '@/lib/powersync/schema';
import {
  Box,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  OutlinedInput,
  Paper,
  Tooltip,
  Typography,
  styled
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { usePowerSync, useQuery } from '@powersync/react';
import { useState } from 'react';

export function CustomerList() {
  const db = usePowerSync();
  const { data: customers } = useQuery<Customer>('SELECT id, name FROM customers ORDER BY created_at ASC');
  const [input, setInput] = useState('');

  const addCustomer = async () => {
    const name = input.trim();
    if (!name) return;
    await db.execute(`INSERT INTO customers (id, name, created_at) VALUES (uuid(), ?, datetime('now'))`, [name]);
    setInput('');
  };

  const deleteCustomer = async (id: string) => {
    await db.execute('DELETE FROM customers WHERE id = ?', [id]);
  };

  return (
    <Card elevation={0}>
      <Typography variant="h6" fontWeight={600} mb={2}>
        Customers
        <Count>{customers.length}</Count>
      </Typography>

      <OutlinedInput
        fullWidth
        size="small"
        placeholder="Add customer…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && addCustomer()}
        endAdornment={
          <InputAdornment position="end">
            <Tooltip title="Add">
              <span>
                <IconButton edge="end" onClick={addCustomer} disabled={!input.trim()} size="small">
                  <AddCircleOutlineIcon />
                </IconButton>
              </span>
            </Tooltip>
          </InputAdornment>
        }
        sx={{ mb: 2 }}
      />

      {customers.length === 0 ? (
        <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
          No customers yet — add one above.
        </Typography>
      ) : (
        <List disablePadding>
          {customers.map((c, i) => (
            <Box key={c.id}>
              {i > 0 && <Divider />}
              <ListItem
                disablePadding
                sx={{ py: 0.5 }}
                secondaryAction={
                  <Tooltip title="Delete">
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => deleteCustomer(c.id!)}
                      sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                }
              >
                <ListItemText primary={c.name} primaryTypographyProps={{ variant: 'body2' }} />
              </ListItem>
            </Box>
          ))}
        </List>
      )}
    </Card>
  );
}

const Card = styled(Paper)`
  background: #161616;
  border: 1px solid #282828;
  border-radius: 12px;
  padding: 20px;
  margin-top: 16px;
`;

const Count = styled('span')`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #282828;
  color: #aaa;
  font-size: 12px;
  font-weight: 500;
  border-radius: 20px;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  margin-left: 8px;
  vertical-align: middle;
`;
