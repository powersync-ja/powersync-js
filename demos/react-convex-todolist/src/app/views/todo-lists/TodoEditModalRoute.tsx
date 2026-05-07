import { TODO_LISTS_ROUTE } from '@/app/router';
import { LISTS_TABLE } from '@/library/powersync/AppSchema';
import CloseIcon from '@mui/icons-material/Close';
import {
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { useQuery } from '@powersync/react';
import React, { Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TodoListsEditor } from './TodoListsEditor';

export default function TodoEditModalRoute() {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const handleClose = () => {
    navigate(TODO_LISTS_ROUTE);
  };

  if (!id) {
    return null;
  }

  return (
    <Dialog
      open
      onClose={handleClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="md"
      scroll="paper"
      aria-labelledby="todo-list-dialog-title"
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(15, 23, 42, 0.78)',
          backdropFilter: 'blur(6px)'
        }
      }}
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          ...(fullScreen
            ? { borderRadius: 0, height: '100%', maxHeight: '100%' }
            : {
                maxHeight: 'min(88vh, 840px)',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider'
              })
        }
      }}
    >
      <DialogTitle
        id="todo-list-dialog-title"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          pr: 1,
          flexShrink: 0,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Suspense fallback={<Typography variant="subtitle1">Loading…</Typography>}>
          <TodoListDialogTitle listId={id} />
        </Suspense>
        <IconButton aria-label="Close list" edge="end" onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent
        sx={{
          px: { xs: 2, sm: 3 },
          pb: { xs: 2, sm: 3 },
          display: 'flex',
          flexDirection: 'column',
          flex: '1 1 auto',
          overflow: 'auto',
          bgcolor: 'background.default',
          borderBottomLeftRadius: (t) => (fullScreen ? 0 : Number(t.shape.borderRadius)),
          borderBottomRightRadius: (t) => (fullScreen ? 0 : Number(t.shape.borderRadius)),
          // MUI zeros padding-top after DialogTitle; match horizontal inset
          '.MuiDialogTitle-root + &': {
            pt: { xs: 2, sm: 3 }
          }
        }}
      >
        <Suspense fallback={<CircularProgress sx={{ alignSelf: 'center', my: 4 }} />}>
          <TodoListsEditor listId={id} />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}

function TodoListDialogTitle({ listId }: { listId: string }) {
  const {
    data: [listRecord]
  } = useQuery<{ name: string }>(`SELECT name FROM ${LISTS_TABLE} WHERE id = ? LIMIT 1`, [listId]);

  return (
    <Typography component="span" variant="h6" sx={{ fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {listRecord?.name ? `Todo List: ${listRecord.name}` : 'Todo List'}
    </Typography>
  );
}
