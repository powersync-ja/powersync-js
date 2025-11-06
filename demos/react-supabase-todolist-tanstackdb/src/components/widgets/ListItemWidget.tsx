import {
  Avatar,
  Box,
  IconButton,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Paper,
  styled
} from '@mui/material';
import React from 'react';

import { TODO_LISTS_ROUTE } from '@/app/router';
import RightIcon from '@mui/icons-material/ArrowRightAlt';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import ListIcon from '@mui/icons-material/ListAltOutlined';
import { usePowerSync } from '@powersync/react';
import { createTransaction } from '@tanstack/db';
import { PowerSyncTransactor } from '@tanstack/powersync-db-collection';
import { useNavigate } from 'react-router-dom';
import { listsCollection, todosCollection } from '../providers/SystemProvider';

export type ListItemWidgetProps = {
  id: string;
  title: string;
  description: string;
  selected?: boolean;
};

export const ListItemWidget: React.FC<ListItemWidgetProps> = React.memo((props) => {
  const { id, title, description, selected } = props;

  const navigate = useNavigate();

  const powerSync = usePowerSync();

  const deleteList = React.useCallback(async () => {
    // Create a transaction that won't auto-commit
    const batchTx = createTransaction({
      autoCommit: false,
      mutationFn: async ({ transaction }) => {
        // Use PowerSyncTransactor to apply the transaction to PowerSync
        await new PowerSyncTransactor({ database: powerSync }).applyTransaction(transaction);
      }
    });

    // Perform multiple operations in the transaction
    batchTx.mutate(() => {
      listsCollection.delete(id);
      todosCollection.forEach((todo) => {
        if (todo.list_id === id) {
          todosCollection.delete(todo.id);
        }
      });
    });

    // Commit the transaction
    await batchTx.commit();

    // Wait for the changes to be persisted
    await batchTx.isPersisted.promise;
  }, [id]);

  const openList = React.useCallback(() => {
    navigate(TODO_LISTS_ROUTE + '/' + id);
  }, [id]);

  return (
    <S.MainPaper elevation={1}>
      <ListItem
        disablePadding
        secondaryAction={
          <Box>
            <IconButton edge="end" aria-label="delete" onClick={deleteList}>
              <DeleteIcon />
            </IconButton>
            <IconButton edge="end" aria-label="proceed" onClick={openList}>
              <RightIcon />
            </IconButton>
          </Box>
        }>
        <ListItemButton onClick={openList} selected={selected}>
          <ListItemAvatar>
            <Avatar>
              <ListIcon />
            </Avatar>
          </ListItemAvatar>
          <ListItemText primary={title} secondary={description} />
        </ListItemButton>
      </ListItem>
    </S.MainPaper>
  );
});

export namespace S {
  export const MainPaper = styled(Paper)`
    margin-bottom: 10px;
  `;
}
