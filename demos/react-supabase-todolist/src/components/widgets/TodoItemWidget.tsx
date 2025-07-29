import { TODOS_TABLE } from '@/library/powersync/AppSchema';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { Box, IconButton, ListItem, ListItemAvatar, ListItemButton, ListItemText, Paper, styled } from '@mui/material';
import { usePowerSync } from '@powersync/react';
import React from 'react';
import { useSupabase } from '../providers/SystemProvider';

export type TodoItemWidgetProps = {
  id: string;
  description: string | null;
  isComplete: boolean;
};

export const TodoItemWidget: React.FC<TodoItemWidgetProps> = React.memo((props) => {
  const { id, description, isComplete } = props;

  const powerSync = usePowerSync();
  const supabase = useSupabase();

  const deleteTodo = React.useCallback(async () => {
    await powerSync.writeTransaction(async (tx) => {
      await tx.execute(
        /* sql */ `
          DELETE FROM ${TODOS_TABLE}
          WHERE
            id = ?
        `,
        [id]
      );
    });
  }, [id]);

  const toggleCompletion = React.useCallback(async () => {
    let completedAt: String | null = null;
    let completedBy: String | null = null;

    if (!isComplete) {
      // Need to set to Completed. This requires a session.
      const userID = supabase?.currentSession?.user.id;
      if (!userID) {
        throw new Error(`Could not get user ID.`);
      }
      completedAt = new Date().toISOString();
      completedBy = userID;
    }

    await powerSync.execute(
      /* sql */ `
        UPDATE ${TODOS_TABLE}
        SET
          completed = ?,
          completed_at = ?,
          completed_by = ?
        WHERE
          id = ?
      `,
      [!isComplete, completedAt, completedBy, id]
    );
  }, [id, isComplete]);

  return (
    <S.MainPaper elevation={1}>
      <ListItem
        disablePadding
        secondaryAction={
          <Box>
            <IconButton edge="end" aria-label="delete" onClick={deleteTodo}>
              <DeleteIcon />
            </IconButton>
          </Box>
        }>
        <ListItemButton onClick={toggleCompletion}>
          <ListItemAvatar>
            <IconButton edge="end" aria-label="toggle">
              {props.isComplete ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
            </IconButton>
          </ListItemAvatar>
          <ListItemText primary={description} />
        </ListItemButton>
      </ListItem>
    </S.MainPaper>
  );
});

namespace S {
  export const MainPaper = styled(Paper)`
    margin-bottom: 10px;
  `;
}
