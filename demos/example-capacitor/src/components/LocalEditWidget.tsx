import DeleteIcon from '@mui/icons-material/Delete';
import { Button, IconButton, List, ListItem, ListItemText, Paper, Typography } from '@mui/material';
import { usePowerSync, useQuery } from '@powersync/react';
import React from 'react';
import { Product } from '../library/powersync/AppSchema.js';

function getRandomProductName() {
  const adjectives = ['Cool', 'Amazing', 'Fresh', 'New', 'Shiny', 'Super', 'Eco', 'Smart'];
  const nouns = ['Widget', 'Gadget', 'Device', 'Item', 'Thing', 'Product', 'Tool', 'Object'];
  return (
    adjectives[Math.floor(Math.random() * adjectives.length)] +
    ' ' +
    nouns[Math.floor(Math.random() * nouns.length)] +
    ' #' +
    Math.floor(Math.random() * 10000)
  );
}

export default function LocalEditWidget() {
  const powerSync = usePowerSync();
  const { data: products } = useQuery<Product>('SELECT * FROM products');

  const addProduct = React.useCallback(() => {
    return powerSync.execute('INSERT INTO products (id, name) VALUES (uuid(), ?)', [getRandomProductName()]);
  }, []);

  const deleteProduct = React.useCallback((product: Product) => {
    return powerSync.execute('DELETE FROM products WHERE id = ?', [product.id]);
  }, []);

  return (
    <Paper sx={{ width: '100%', p: 2 }} elevation={1}>
      <Typography variant="h6" gutterBottom>
        Products
      </Typography>
      <Typography>Perform local only edits to Products. These won't be synced.</Typography>
      <Button variant="contained" color="primary" onClick={addProduct} sx={{ m: 2 }}>
        Add Random Product
      </Button>
      <List>
        {products.length === 0 ? (
          <ListItem>
            <ListItemText primary="No products yet." />
          </ListItem>
        ) : (
          products.map((product) => (
            <ListItem
              key={product.id}
              secondaryAction={
                <IconButton edge="end" aria-label="delete" onClick={() => deleteProduct(product)}>
                  <DeleteIcon />
                </IconButton>
              }>
              <ListItemText primary={product.name} />
            </ListItem>
          ))
        )}
      </List>
    </Paper>
  );
}
