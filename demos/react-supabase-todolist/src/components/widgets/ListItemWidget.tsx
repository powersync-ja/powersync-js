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
import { LISTS_TABLE, TODOS_TABLE } from '@/library/powersync/AppSchema';
import RightIcon from '@mui/icons-material/ArrowRightAlt';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import ListIcon from '@mui/icons-material/ListAltOutlined';
import { usePowerSync } from '@powersync/react';
import { useNavigate } from 'react-router-dom';

export type ListItemWidgetProps = {
  id: string;
  title: string;
  description: string;
  selected?: boolean;
};

export const ListItemWidget: React.FC<ListItemWidgetProps> = React.memo((props) => {
  const { id, title, description, selected } = props;

  const powerSync = usePowerSync();
  const navigate = useNavigate();

  const deleteList = React.useCallback(async () => {
    await powerSync.writeTransaction(async (tx) => {
      // Delete associated todos
      await tx.execute(
        /* sql */ `
          DELETE FROM ${TODOS_TABLE}
          WHERE
            list_id = ?
        `,
        [id]
      );
      // Delete list record
      await tx.execute(
        /* sql */ `
          DELETE FROM ${LISTS_TABLE}
          WHERE
            id = ?
        `,
        [id]
      );
    });
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
