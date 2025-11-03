import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { Box, IconButton, ListItem, ListItemAvatar, ListItemButton, ListItemText, Paper, styled } from '@mui/material';
import React from 'react';
import { todosCollection, useSupabase } from '../providers/SystemProvider';

export type TodoItemWidgetProps = {
  id: string;
  description: string | null;
  isComplete: boolean;
};

export const TodoItemWidget: React.FC<TodoItemWidgetProps> = React.memo((props) => {
  const { id, description, isComplete } = props;

  const supabase = useSupabase();

  const deleteTodo = React.useCallback(async () => {
    await todosCollection.delete(id).isPersisted.promise;
  }, [id]);

  const toggleCompletion = React.useCallback(async () => {
    let completedAt: Date | null = null;
    let completedBy: string | null = null;

    if (!isComplete) {
      // Need to set to Completed. This requires a session.
      const userID = supabase?.currentSession?.user.id;
      if (!userID) {
        throw new Error(`Could not get user ID.`);
      }
      completedAt = new Date();
      completedBy = userID;
    }

    await todosCollection.update(id, (draft) => {
      draft.completed = !isComplete;
      draft.completed_at = completedAt;
      draft.completed_by = completedBy;
    }).isPersisted.promise;
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
