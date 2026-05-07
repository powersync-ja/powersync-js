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

export type ListItemWidgetProps = {
  title: string;
  description: string;
  avatarSrc: string;
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
            <Avatar
              variant="rounded"
              src={props.avatarSrc}
              alt=""
              imgProps={{ loading: 'lazy' }}
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'rgba(148, 163, 184, 0.12)',
                border: '1px solid',
                borderColor: 'divider',
                boxSizing: 'border-box',
                '& img': {
                  objectFit: 'contain',
                  objectPosition: 'center',
                  width: '100%',
                  height: '100%'
                }
              }}
            />
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
