import React from 'react';
import {
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Paper,
  styled,
  ListItemButton,
  alpha,
  Chip,
  Stack,
  Typography
} from '@mui/material';

export type ListItemWidgetProps = {
  title: string;
  description: string;
  avatarSrc: string;
  selected?: boolean;
  archived?: boolean;
  /** Short label shown under the task summary, e.g. "Priority: high" */
  priorityLabel?: string;
  onPress: () => void;
};

export const ListItemWidget: React.FC<ListItemWidgetProps> = (props) => {
  return (
    <S.MainPaper elevation={0}>
      <ListItem disablePadding>
        <ListItemButton
          onClick={() => {
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
          <ListItemText
            primary={
              <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" component="span">
                <Typography component="span" variant="body1" sx={{ fontWeight: 600 }}>
                  {props.title}
                </Typography>
                {props.archived ? <Chip size="small" label="Archived" variant="outlined" /> : null}
              </Stack>
            }
            secondary={
              <Stack component="span" spacing={0.25} sx={{ mt: 0.25 }}>
                <Typography component="span" variant="body2" color="text.secondary">
                  {props.description}
                </Typography>
                {props.priorityLabel ? (
                  <Typography component="span" variant="caption" color="text.secondary">
                    {props.priorityLabel}
                  </Typography>
                ) : null}
              </Stack>
            }
          />
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
