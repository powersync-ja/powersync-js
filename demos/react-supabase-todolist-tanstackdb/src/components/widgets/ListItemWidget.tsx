import {
  Avatar,
  Box,
  IconButton,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Paper,
  Tooltip,
  styled
} from '@mui/material';
import React from 'react';

import { TODO_LISTS_ROUTE } from '@/app/router';
import RightIcon from '@mui/icons-material/ArrowRightAlt';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import HideImageOutlinedIcon from '@mui/icons-material/HideImageOutlined';
import ListIcon from '@mui/icons-material/ListAltOutlined';
import { usePowerSync } from '@powersync/react';
import { createTransaction } from '@tanstack/db';
import { PowerSyncTransactor } from '@tanstack/powersync-db-collection';
import { useNavigate } from 'react-router-dom';
import { useAttachments } from '../providers/AttachmentsProvider';
import { listsCollection, todosCollection } from '../providers/SystemProvider';

export type ListItemWidgetProps = {
  id: string;
  title: string;
  description: string;
  localUri?: string | null;
  photo_id?: string | null;
  selected?: boolean;
};

export const ListItemWidget: React.FC<ListItemWidgetProps> = React.memo((props) => {
  const { id, title, description, localUri, selected, photo_id } = props;

  const navigate = useNavigate();
  const attachments = useAttachments();

  const powerSync = usePowerSync();

  const deleteListAndTodos = React.useCallback(() => {
    listsCollection.delete(id);
    todosCollection.forEach((todo) => {
      if (todo.list_id === id) {
        todosCollection.delete(todo.id);
      }
    });
  }, [id]);

  const deleteList = React.useCallback(async () => {
    if (attachments && photo_id) {
      await attachments.queue.deleteFileTanStack({
        id: photo_id,
        updateHook: async () => {
          // This happens in the same transaction as queueing the attachment delete
          deleteListAndTodos();
        }
      });
    } else {

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
        deleteListAndTodos();
      });

      // Commit the transaction
      await batchTx.commit();

      // Wait for the changes to be persisted
      await batchTx.isPersisted.promise;
    }
  }, [attachments, photo_id, powerSync, deleteListAndTodos]);

  const openList = React.useCallback(() => {
    navigate(TODO_LISTS_ROUTE + '/' + id);
  }, [id]);

  const deleteAttachment = React.useCallback(async () => {
    if (!attachments) {
      return;
    }
    await attachments.queue.deleteFileTanStack({
      id: photo_id!,
      updateHook: async () => {
        // This should happen in the same transaction as creating the attachment
        listsCollection.update(id, (draft) => {
          draft.photo_id = null;
        });
      }
    });
  }, [attachments, photo_id, id]);
  return (
    <S.MainPaper elevation={1}>
      <ListItem
        disablePadding
        secondaryAction={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {attachments && photo_id && (
              <Tooltip title="Remove photo">
                <IconButton edge="end" aria-label="remove photo" onClick={deleteAttachment}>
                  <HideImageOutlinedIcon />
                </IconButton>
              </Tooltip>
            )}
            <IconButton edge="end" aria-label="delete" onClick={deleteList}>
              <DeleteIcon />
            </IconButton>
            <IconButton edge="end" aria-label="proceed" onClick={openList}>
              <RightIcon />
            </IconButton>
          </Box>
        }
      >
        <ListItemButton onClick={openList} selected={selected}>
          <ListItemAvatar>
            <Avatar>
              <ListIcon />
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={title}
            secondary={
              <>
                {description}
                {attachments && (
                  <>
                    <br />
                    local_uri: {localUri ?? 'none'}
                  </>
                )}
              </>
            }
          />
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
