import React from 'react';
import { ListItem, IconButton, ListItemAvatar, ListItemText, Box, styled, Paper, ListItemButton } from '@mui/material';
import { DeleteOutline, CheckBoxOutlineBlank, CheckBox } from '@mui/icons-material';

export type TodoItemWidgetProps = {
  description: string | null;
  isComplete: boolean;
  onDelete: () => void;
  toggleCompletion: () => void;
};

export const TodoItemWidget: React.FC<TodoItemWidgetProps> = (props) => {
  return (
    <S.MainPaper elevation={1}>
      <ListItem
        disablePadding
        secondaryAction={
          <Box>
            <IconButton
              edge="end"
              aria-label="delete"
              onClick={() => {
                props.onDelete();
              }}
            >
              <DeleteOutline />
            </IconButton>
          </Box>
        }
      >
        <ListItemButton
          onClick={() => {
            props.toggleCompletion();
          }}
        >
          <ListItemAvatar>
            <IconButton edge="end" aria-label="toggle">
              {props.isComplete ? <CheckBox /> : <CheckBoxOutlineBlank />}
            </IconButton>
          </ListItemAvatar>
          <ListItemText primary={props.description} />
        </ListItemButton>
      </ListItem>
    </S.MainPaper>
  );
};

namespace S {
  export const MainPaper = styled(Paper)`
    margin-bottom: 10px;
  `;
}
