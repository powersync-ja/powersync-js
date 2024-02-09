'use client';
import _ from 'lodash';
import React, { Suspense } from 'react';
import { useSupabase } from '@/components/providers/SystemProvider';
import { LISTS_TABLE, TODOS_TABLE, TodoRecord } from '@/library/powersync/AppSchema';
import { usePowerSync, usePowerSyncWatchedQuery } from '@journeyapps/powersync-react';
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
import AddIcon from '@mui/icons-material/Add';
import { NavigationPage } from '@/components/navigation/NavigationPage';
import { TodoItemWidget } from '@/components/widgets/TodoItemWidget';
import { useSearchParams } from 'next/navigation';

/**
 * useSearchParams causes the entire element to fall back to client side rendering
 * This is exposed as a separate React component in order to suspend its render
 * and allow the root page to render on the server.
 */
const TodoEditSection = () => {
  const powerSync = usePowerSync();
  const supabase = useSupabase();
  const params = useSearchParams();
  const listID = (params.get('id') as string) || '';

  const [listRecord] = usePowerSyncWatchedQuery<{ name: string }>(`SELECT name FROM ${LISTS_TABLE} WHERE id = ?`, [
    listID
  ]);

  const todos = usePowerSyncWatchedQuery<TodoRecord>(`SELECT * FROM todos WHERE list_id=?`, [listID]);

  const [showPrompt, setShowPrompt] = React.useState(false);
  const nameInputRef = React.createRef<HTMLInputElement>();

  const toggleCompletion = async (record: TodoRecord, completed: boolean) => {
    const updatedRecord = { ...record, completed: completed };
    if (completed) {
      const userID = supabase?.currentSession?.user.id;
      if (!userID) {
        throw new Error(`Could not get user ID.`);
      }
      updatedRecord.completed_at = new Date().toISOString();
      updatedRecord.completed_by = userID;
    } else {
      updatedRecord.completed_at = undefined;
      updatedRecord.completed_by = undefined;
    }
    await powerSync.execute(
      `UPDATE ${TODOS_TABLE}
              SET completed = ?,
                  completed_at = ?,
                  completed_by = ?
              WHERE id = ?`,
      [completed, updatedRecord.completed_at, updatedRecord.completed_by, record.id]
    );
  };

  const createNewTodo = async (description: string) => {
    const userID = supabase?.currentSession?.user.id;
    if (!userID) {
      throw new Error(`Could not get user ID.`);
    }

    await powerSync.execute(
      `INSERT INTO
                ${TODOS_TABLE}
                    (id, created_at, created_by, description, list_id) 
                VALUES
                    (uuid(), datetime(), ?, ?, ?)`,
      [userID, description, listID!]
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
                isComplete={r.completed}
                toggleCompletion={() => toggleCompletion(r, !r.completed)}
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
        >
          <DialogTitle id="alert-dialog-title">{'Create Todo Item'}</DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">Enter a description for a new todo item</DialogContentText>
            <TextField sx={{ marginTop: '10px' }} fullWidth inputRef={nameInputRef} autoFocus label="Name" />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowPrompt(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                await createNewTodo(nameInputRef.current!.value);
                setShowPrompt(false);
              }}
            >
              Create
            </Button>
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
