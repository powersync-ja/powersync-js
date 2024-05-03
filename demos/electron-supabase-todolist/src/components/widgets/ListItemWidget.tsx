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

import { DeleteOutline, ArrowRightAlt, ListAltOutlined } from '@mui/icons-material';

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
              onClick={() => {
                props.onDelete();
              }}
            >
              <DeleteOutline />
            </IconButton>
            <IconButton
              edge="end"
              aria-label="proceed"
              onClick={() => {
                props.onPress();
              }}
            >
              <ArrowRightAlt />
            </IconButton>
          </Box>
        }
      >
        <ListItemButton
          onClick={() => {
            props.onPress();
          }}
          selected={props.selected}
        >
          <ListItemAvatar>
            <Avatar>
              <ListAltOutlined />
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
