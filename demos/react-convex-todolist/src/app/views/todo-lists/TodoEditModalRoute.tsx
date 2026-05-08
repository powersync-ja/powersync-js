import { TODO_LISTS_ROUTE } from '@/app/router';
import { LISTS_TABLE } from '@/library/powersync/AppSchema';
import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
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
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
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
            ? {
                borderRadius: 0,
                height: '100%',
                maxHeight: '100%',
                minHeight: '100dvh',
                maxWidth: '100%'
              }
            : {
                minHeight: {
                  sm: 'min(50vh, 440px)',
                  md: 'min(56vh, 520px)',
                  lg: 'min(60vh, 600px)',
                  xl: 'min(62vh, 680px)'
                },
                maxHeight: {
                  sm: 'min(91vh, 880px)',
                  md: 'min(93vh, 1000px)',
                  lg: 'min(95vh, 1160px)',
                  xl: 'min(96vh, 1280px)'
                },
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
          minHeight: 0,
          overflow: 'hidden',
          bgcolor: 'background.default',
          borderBottomLeftRadius: (t) => (fullScreen ? 0 : Number(t.shape.borderRadius)),
          borderBottomRightRadius: (t) => (fullScreen ? 0 : Number(t.shape.borderRadius)),
          // MUI zeros padding-top after DialogTitle; match horizontal inset
          '.MuiDialogTitle-root + &': {
            pt: { xs: 2, sm: 3 }
          }
        }}
      >
        <Suspense
          fallback={
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          }
        >
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <TodoListsEditor listId={id} />
          </Box>
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
