import React from 'react';
import { ListItem, IconButton, ListItemAvatar, ListItemText, Box, styled, Paper, ListItemButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';

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
              <DeleteIcon />
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
              {props.isComplete ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
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
