import { OutlinedComposer } from '@/components/widgets/OutlinedComposer';
import { TodoItemWidget } from '@/components/widgets/TodoItemWidget';
import { LISTS_TABLE, TODOS_TABLE, TodoRecord } from '@/library/powersync/AppSchema';
import { useUserId } from '@/library/powersync/useUserId';
import { Box, List, Typography } from '@mui/material';
import { usePowerSync, useQuery } from '@powersync/react';
import React from 'react';

export type TodoListsEditorProps = {
  listId: string;
};

export function TodoListsEditor(props: TodoListsEditorProps) {
  const powerSync = usePowerSync();
  const userID = useUserId();
  const { listId } = props;

  const {
    data: [listRecord]
  } = useQuery<{ name: string }>(`SELECT name FROM ${LISTS_TABLE} WHERE id = ? ORDER BY created_at`, [listId]);

  const { data: todos } = useQuery<TodoRecord>(
    `SELECT * FROM ${TODOS_TABLE} WHERE list_uuid=? ORDER BY created_at, id`,
    [listId]
  );

  const [newTodoText, setNewTodoText] = React.useState('');

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
      [userID, description, description, listId]
    );
  };

  const deleteTodo = async (id: string) => {
    await powerSync.writeTransaction(async (tx) => {
      await tx.execute(`DELETE FROM ${TODOS_TABLE} WHERE id = ?`, [id]);
    });
  };

  if (!listRecord) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>No matching list found.</Typography>
      </Box>
    );
  }

  const submitNewTodo = async () => {
    const trimmed = newTodoText.trim();
    if (trimmed && userID) {
      await createNewTodo(trimmed);
    }
    setNewTodoText('');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: { xs: '50vh', md: 'min(70vh, 560px)' }
      }}
    >
      <List dense={false} sx={{ flex: '1 1 auto', pb: 0 }}>
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
      <OutlinedComposer
        value={newTodoText}
        onChange={setNewTodoText}
        onSubmit={submitNewTodo}
        placeholder="Add a new todo"
        inputAriaLabel="New todo description"
        submitAriaLabel="Add todo"
        autoFocus
        formSx={{
          position: 'sticky',
          bottom: 0,
          flexShrink: 0,
          pt: 0.5,
          pb: 0,
          mt: 'auto'
        }}
      />
    </Box>
  );
}
