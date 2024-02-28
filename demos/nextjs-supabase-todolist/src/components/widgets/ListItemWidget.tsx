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
  ListItemButton
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
    <S.MainPaper elevation={1}>
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
            <Avatar>
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
    margin-bottom: 10px;
  `;
}
