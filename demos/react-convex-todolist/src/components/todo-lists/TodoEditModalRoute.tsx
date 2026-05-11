import { TODO_LISTS_ROUTE } from '@/app/router';
import {
  stringArrayToTagsJson,
  tagsJsonToStringArray
} from './listFormUtils';
import { LISTS_TABLE, TODOS_TABLE } from '@/library/powersync/AppSchema';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputBase,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { usePowerSync, useQuery } from '@powersync/react';
import { Field, type FieldProps, Formik, useFormikContext } from 'formik';
import React, { Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TodoListsEditor, type ListDetailsFormValues } from './TodoListsEditor';

type ListDetailRow = {
  name: string;
  notes: string | null;
  priority: number | null;
  tags: string | null;
  archived: number | null;
};

function listDetailInitialValues(row: ListDetailRow): ListDetailsFormValues {
  return {
    name: row.name ?? '',
    notes: row.notes ?? '',
    tags: tagsJsonToStringArray(row.tags),
    priority: row.priority ?? 0
  };
}

function validateListDetails(values: ListDetailsFormValues) {
  const errors: Partial<Record<keyof ListDetailsFormValues, string>> = {};
  if (!values.name.trim()) {
    errors.name = 'List name is required';
  }
  return errors;
}

const LIST_DETAILS_PERSIST_DEBOUNCE_MS = 400;

function persistPayloadKey(values: ListDetailsFormValues) {
  return JSON.stringify({
    name: values.name.trim(),
    notes: values.notes,
    tags: stringArrayToTagsJson(values.tags),
    priority: values.priority
  });
}

type TodoEditModalShellProps = {
  listId: string;
  listRecord: ListDetailRow;
  fullScreen: boolean;
  onClose: () => void;
};

function TodoEditModalShell(props: TodoEditModalShellProps) {
  const { listId, listRecord, fullScreen, onClose } = props;
  const theme = useTheme();
  const { values, errors, resetForm } = useFormikContext<ListDetailsFormValues>();
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const menuOpen = Boolean(menuAnchor);
  const powerSync = usePowerSync();
  const navigate = useNavigate();
  const archived = Number(listRecord.archived) === 1;
  const lastPersistedKey = React.useRef<string | null>(null);
  const seededPersistBaseline = React.useRef(false);
  const persistDebounceRef = React.useRef<number | null>(null);

  const tryCommitValues = React.useCallback(
    async (currentValues: ListDetailsFormValues, nameError?: string) => {
      if (nameError) {
        return;
      }
      const key = persistPayloadKey(currentValues);
      if (key === lastPersistedKey.current) {
        return;
      }
      const trimmedName = currentValues.name.trim();
      await powerSync.writeTransaction(async (tx) => {
        await tx.execute(`UPDATE ${LISTS_TABLE} SET name = ?, notes = ?, tags = ?, priority = ? WHERE id = ?`, [
          trimmedName,
          currentValues.notes,
          stringArrayToTagsJson(currentValues.tags),
          currentValues.priority,
          listId
        ]);
      });
      lastPersistedKey.current = key;
      resetForm({
        values: {
          ...currentValues,
          name: trimmedName
        }
      });
    },
    [listId, powerSync, resetForm]
  );

  const handleRequestClose = React.useCallback(() => {
    if (persistDebounceRef.current != null) {
      window.clearTimeout(persistDebounceRef.current);
      persistDebounceRef.current = null;
    }
    void (async () => {
      await tryCommitValues(values, errors.name);
      onClose();
    })();
  }, [errors.name, onClose, tryCommitValues, values]);

  React.useEffect(() => {
    if (!seededPersistBaseline.current) {
      seededPersistBaseline.current = true;
      lastPersistedKey.current = persistPayloadKey(values);
      return;
    }

    if (errors.name) {
      return;
    }

    const handle = window.setTimeout(() => {
      persistDebounceRef.current = null;
      void tryCommitValues(values, errors.name);
    }, LIST_DETAILS_PERSIST_DEBOUNCE_MS) as unknown as number;
    persistDebounceRef.current = handle;

    return () => {
      window.clearTimeout(handle);
      if (persistDebounceRef.current === handle) {
        persistDebounceRef.current = null;
      }
    };
  }, [errors.name, tryCommitValues, values]);

  const setArchived = async (next: boolean) => {
    await powerSync.execute(`UPDATE ${LISTS_TABLE} SET archived = ? WHERE id = ?`, [next ? 1 : 0, listId]);
  };

  const deleteList = async () => {
    await powerSync.writeTransaction(async (tx) => {
      await tx.execute(`DELETE FROM ${TODOS_TABLE} WHERE list_uuid = ?`, [listId]);
      await tx.execute(`DELETE FROM ${LISTS_TABLE} WHERE id = ?`, [listId]);
    });
    setDeleteOpen(false);
    navigate(TODO_LISTS_ROUTE);
  };

  return (
    <>
      <Dialog
        open
        onClose={() => {
          handleRequestClose();
        }}
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
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
            rowGap: 0.75,
            gap: 0.5,
            pr: 0.5,
            flexShrink: 0,
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Field name="name">
            {({ field, meta }: FieldProps<string>) => (
              <Box sx={{ flex: 1, minWidth: 0, mr: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                <InputBase
                  {...field}
                  id="todo-list-dialog-title"
                  fullWidth
                  placeholder="List name"
                  aria-label="List name"
                  aria-invalid={meta.touched && Boolean(meta.error)}
                  sx={{
                    fontSize: theme.typography.h6.fontSize,
                    lineHeight: theme.typography.h6.lineHeight,
                    fontWeight: 800,
                    color: 'text.primary',
                    '& .MuiInputBase-input': {
                      padding: '2px 0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }
                  }}
                />
                {meta.touched && meta.error ? (
                  <Typography variant="caption" color="error" sx={{ mt: 0.25 }} role="alert">
                    {meta.error}
                  </Typography>
                ) : null}
              </Box>
            )}
          </Field>
          <IconButton
            size="small"
            aria-label="List actions"
            aria-controls={menuOpen ? 'list-actions-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={menuOpen ? 'true' : undefined}
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            sx={{ flexShrink: 0 }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <IconButton aria-label="Close list" edge="end" onClick={handleRequestClose} size="small" sx={{ flexShrink: 0 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Menu id="list-actions-menu" anchorEl={menuAnchor} open={menuOpen} onClose={() => setMenuAnchor(null)}>
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              void setArchived(!archived);
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              {archived ? <UnarchiveOutlinedIcon fontSize="small" /> : <ArchiveOutlinedIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText
              primaryTypographyProps={{ variant: 'body2' }}
              primary={archived ? 'Unarchive list' : 'Archive list'}
            />
          </MenuItem>
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              setDeleteOpen(true);
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <DeleteOutlineIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primaryTypographyProps={{ variant: 'body2', sx: { color: 'error.main' } }}
              primary="Delete list…"
            />
          </MenuItem>
        </Menu>
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
              <TodoListsEditor listId={listId} />
            </Box>
          </Suspense>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} aria-labelledby="delete-list-title">
        <DialogTitle id="delete-list-title">Delete this list?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {`This permanently removes "${values.name.trim() || listRecord.name}" and every todo in it. This cannot be undone.`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void deleteList()}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default function TodoEditModalRoute() {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const { id: listId } = useParams<{ id: string }>();

  const handleClose = () => {
    navigate(TODO_LISTS_ROUTE);
  };

  const {
    data: [listRecord]
  } = useQuery<ListDetailRow>(
    `SELECT name, notes, priority, tags, archived FROM ${LISTS_TABLE} WHERE id = ? LIMIT 1`,
    [listId ?? '']
  );

  if (!listId) {
    return null;
  }

  if (!listRecord) {
    return (
      <Dialog open onClose={handleClose} fullScreen={fullScreen}>
        <DialogContent>
          <Typography>No matching list found.</Typography>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Formik<ListDetailsFormValues>
      key={listId}
      initialValues={listDetailInitialValues(listRecord)}
      validate={validateListDetails}
      onSubmit={() => {}}
    >
      <TodoEditModalShell listId={listId} listRecord={listRecord} fullScreen={fullScreen} onClose={handleClose} />
    </Formik>
  );
}
