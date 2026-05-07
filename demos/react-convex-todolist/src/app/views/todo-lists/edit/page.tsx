import { NavigationPage } from '@/components/navigation/NavigationPage';
import { TodoItemWidget } from '@/components/widgets/TodoItemWidget';
import { LISTS_TABLE, TODOS_TABLE, TodoRecord } from '@/library/powersync/AppSchema';
import { useUserId } from '@/library/powersync/useUserId';
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
import React, { Suspense } from 'react';
import { useParams } from 'react-router-dom';

/**
 * useSearchParams causes the entire element to fall back to client side rendering
 * This is exposed as a separate React component in order to suspend its render
 * and allow the root page to render on the server.
 */
const TodoEditSection = () => {
  const powerSync = usePowerSync();
  const userID = useUserId();
  const { id: listID } = useParams();

  const {
    data: [listRecord]
  } = useQuery<{ name: string }>(`SELECT name FROM ${LISTS_TABLE} WHERE id = ? ORDER BY created_at`, [listID]);

  const { data: todos } = useQuery<TodoRecord>(
    `SELECT * FROM ${TODOS_TABLE} WHERE list_uuid=? ORDER BY created_at, id`,
    [listID]
  );

  const [showPrompt, setShowPrompt] = React.useState(false);
  const nameInputRef = React.createRef<HTMLInputElement>();

  const toggleCompletion = async (record: TodoRecord, completed: boolean) => {
    if (!userID) {
      throw new Error(`Could not get user ID.`);
    }
    const status = completed ? 'completed' : 'pending';
    const completedAt = completed ? new Date().toISOString() : null;
    const completedBy = completed ? userID : null;
    await powerSync.execute(
      `UPDATE ${TODOS_TABLE}
              SET status = ?,
                  completed = ?,
                  completed_at = ?,
                  completed_by = ?
              WHERE id = ?`,
      [status, completed ? 1 : 0, completedAt, completedBy, record.id]
    );
  };

  const createNewTodo = async (description: string) => {
    if (!userID) {
      throw new Error(`Could not get user ID.`);
    }

    await powerSync.execute(
      `INSERT INTO
                ${TODOS_TABLE}
                    (id, created_at, created_by, description, title, list_uuid, completed, status, priority, is_urgent, is_private, tags) 
                VALUES
                    (uuid(), datetime(), ?, ?, ?, ?, 0, 'pending', 3, 0, 0, '[]')`,
      [userID, description, description, listID!]
    );
  };

  const deleteTodo = async (id: string) => {
    await powerSync.writeTransaction(async (tx) => {
      await tx.execute(`DELETE FROM ${TODOS_TABLE} WHERE id = ?`, [id]);
    });
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
              <TodoItemWidget
                key={r.id}
                description={r.description}
                onDelete={() => deleteTodo(r.id)}
                isComplete={r.completed === 1}
                toggleCompletion={() => toggleCompletion(r, r.completed !== 1)}
              />
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
