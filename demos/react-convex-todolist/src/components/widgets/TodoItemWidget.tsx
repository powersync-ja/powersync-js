import React from 'react';
import {
  ListItem,
  IconButton,
  ListItemAvatar,
  ListItemText,
  Box,
  styled,
  Paper,
  ListItemButton,
  alpha
} from '@mui/material';

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
    <S.MainPaper elevation={0}>
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
    overflow: hidden;
    border: 1px solid ${({ theme }) => theme.palette.divider};
    transition: border-color 160ms ease, box-shadow 160ms ease;

    &:hover {
      border-color: ${({ theme }) => alpha(theme.palette.secondary.main, 0.36)};
      box-shadow: 0 12px 26px rgba(23, 32, 51, 0.07);
    }
  `;
}
