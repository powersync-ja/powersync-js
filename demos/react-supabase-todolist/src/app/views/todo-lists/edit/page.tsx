import { NavigationPage } from '@/components/navigation/NavigationPage';
import { useSupabase } from '@/components/providers/SystemProvider';
import { TodoItemWidget } from '@/components/widgets/TodoItemWidget';
import { LISTS_TABLE, TODOS_TABLE, TodoRecord } from '@/library/powersync/AppSchema';
import AddIcon from '@mui/icons-material/Add';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  TextField,
  Typography,
  styled
} from '@mui/material';
import Fab from '@mui/material/Fab';
import { usePowerSync, useQuery } from '@powersync/react';
import { DEFAULT_WATCHED_QUERY_DIFFERENTIATOR } from '@powersync/web';
import React, { Suspense } from 'react';
import { useParams } from 'react-router-dom';

/**
 * useSearchParams causes the entire element to fall back to client side rendering
 * This is exposed as a separate React component in order to suspend its render
 * and allow the root page to render on the server.
 */
const TodoEditSection = () => {
  const powerSync = usePowerSync();
  const supabase = useSupabase();
  const { id: listID } = useParams();

  const {
    data: [listRecord]
  } = useQuery<{ name: string }>(
    /* sql */ `
      SELECT
        name
      FROM
        ${LISTS_TABLE}
      WHERE
        id = ?
    `,
    [listID]
  );

  const { data: todos } = useQuery<TodoRecord>(
    /* sql */ `
      SELECT
        *
      FROM
        ${TODOS_TABLE}
      WHERE
        list_id = ?
      ORDER BY
        created_at DESC,
        id
    `,
    [listID],
    {
      differentiator: DEFAULT_WATCHED_QUERY_DIFFERENTIATOR
    }
  );

  const [showPrompt, setShowPrompt] = React.useState(false);
  const nameInputRef = React.createRef<HTMLInputElement>();

  const createNewTodo = async (description: string) => {
    const userID = supabase?.currentSession?.user.id;
    if (!userID) {
      throw new Error(`Could not get user ID.`);
    }

    await powerSync.execute(
      /* sql */ `
        INSERT INTO
          ${TODOS_TABLE} (id, created_at, created_by, description, list_id)
        VALUES
          (uuid (), datetime (), ?, ?, ?)
      `,
      [userID, description, listID!]
    );
  };

  if (!listRecord) {
    return (
      <Box>
        <Typography>No matching List found, please navigate back...</Typography>
      </Box>
    );
  }

  return (
    <NavigationPage title={`Todo List: ${listRecord.name}`}>
      <Box>
        <S.FloatingActionButton onClick={() => setShowPrompt(true)}>
          <AddIcon />
        </S.FloatingActionButton>
        <Box>
          <List dense={false}>
            {todos.map((r) => (
              <TodoItemWidget key={r.id} id={r.id} description={r.description} isComplete={r.completed == 1} />
            ))}
          </List>
        </Box>
        {/* TODO use a dialog service in future, this is just a simple example app */}
        <Dialog
          open={showPrompt}
          onClose={() => setShowPrompt(false)}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
          PaperProps={{
            component: 'form',
            onSubmit: async (event: React.FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              await createNewTodo(nameInputRef.current!.value);
              setShowPrompt(false);
            }
          }}>
          <DialogTitle id="alert-dialog-title">{'Create Todo Item'}</DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">Enter a description for a new todo item</DialogContentText>
            <TextField sx={{ marginTop: '10px' }} fullWidth inputRef={nameInputRef} autoFocus label="Task Name" />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowPrompt(false)}>Cancel</Button>
            <Button type="submit">Create</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </NavigationPage>
  );
};

export default function TodoEditPage() {
  return (
    <Box>
      <Suspense fallback={<CircularProgress />}>
        <TodoEditSection />
      </Suspense>
    </Box>
  );
}

namespace S {
  export const FloatingActionButton = styled(Fab)`
    position: absolute;
    bottom: 20px;
    right: 20px;
  `;
}
