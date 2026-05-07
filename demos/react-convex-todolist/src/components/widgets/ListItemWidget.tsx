import React from 'react';
import {
  ListItem,
  IconButton,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Box,
  Paper,
  styled,
  ListItemButton,
  alpha
} from '@mui/material';

import DeleteIcon from '@mui/icons-material/DeleteOutline';
import RightIcon from '@mui/icons-material/ArrowRightAlt';
import ListIcon from '@mui/icons-material/ListAltOutlined';

export type ListItemWidgetProps = {
  title: string;
  description: string;
  selected?: boolean;
  onDelete: () => void;
  onPress: () => void;
};

export const ListItemWidget: React.FC<ListItemWidgetProps> = (props) => {
  return (
    <S.MainPaper elevation={0}>
      <ListItem
        disablePadding
        secondaryAction={
          <Box>
            <IconButton
              edge="end"
              aria-label="delete"
              onClick={(event) => {
                props.onDelete();
              }}
            >
              <DeleteIcon />
            </IconButton>
            <IconButton
              edge="end"
              aria-label="proceed"
              onClick={(event) => {
                props.onPress();
              }}
            >
              <RightIcon />
            </IconButton>
          </Box>
        }
      >
        <ListItemButton
          onClick={(event) => {
            props.onPress();
          }}
          selected={props.selected}
        >
          <ListItemAvatar>
            <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.dark' }}>
              <ListIcon />
            </Avatar>
          </ListItemAvatar>
          <ListItemText primary={props.title} secondary={props.description} />
        </ListItemButton>
      </ListItem>
    </S.MainPaper>
  );
};

export namespace S {
  export const MainPaper = styled(Paper)`
    margin-bottom: 12px;
    overflow: hidden;
    border: 1px solid ${({ theme }) => theme.palette.divider};
    transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;

    &:hover {
      border-color: ${({ theme }) => alpha(theme.palette.primary.main, 0.35)};
      box-shadow: 0 14px 30px rgba(23, 32, 51, 0.08);
      transform: translateY(-1px);
    }
  `;
}
