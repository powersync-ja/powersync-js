import type { ListDetailsFormValues } from '@/app/views/todo-lists/listDetailsFormTypes';
import { LIST_PRIORITY_COMPACT, LIST_PRIORITY_OPTIONS } from '@/app/views/todo-lists/listFormUtils';
import { OutlinedComposer } from '@/components/widgets/OutlinedComposer';
import { SmartTagEditor } from '@/components/widgets/SmartTagEditor';
import { TodoItemWidget } from '@/components/widgets/TodoItemWidget';
import { TodoRecord } from '@/library/powersync/AppSchema';
import { useUserId } from '@/library/powersync/useUserId';
import { Box, FormControl, List, MenuItem, Paper, Select, TextField, Typography } from '@mui/material';
import { usePowerSync, useQuery } from '@powersync/react';
import { Field, type FieldProps, Form, useFormikContext } from 'formik';
import React from 'react';

export type TodoListsEditorProps = {
  listId: string;
};

function ListDetailsFields() {
  const { values, setFieldValue } = useFormikContext<ListDetailsFormValues>();
  const prioritySelectId = React.useId();

  return (
    <Paper
      variant="outlined"
      sx={{
        flexShrink: 0,
        p: 2,
        mb: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        bgcolor: 'background.paper'
      }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700 }}>
        List details
      </Typography>
      <Form
        id="list-details-form"
        onSubmit={(e) => {
          e.preventDefault();
        }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Tags — click a pill to rename, Enter to add a new tag. List details save automatically after you stop typing.
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            gap: 0.75,
            width: '100%',
            mt: 0.5
          }}>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 0.75,
              flex: '1 1 0',
              minWidth: 120
            }}>
            <SmartTagEditor
              tags={values.tags}
              onTagsChange={(next) => {
                void setFieldValue('tags', next);
              }}
            />
          </Box>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              flexShrink: 0,
              ml: 'auto'
            }}>
            <Typography
              component="label"
              variant="caption"
              htmlFor={prioritySelectId}
              sx={{ fontWeight: 700, color: 'text.secondary', flexShrink: 0 }}>
              Priority
            </Typography>
            <FormControl
              size="small"
              variant="outlined"
              sx={{
                minWidth: 88,
                maxWidth: 120,
                '& .MuiOutlinedInput-root': {
                  height: 28,
                  fontSize: '0.75rem',
                  borderRadius: 1
                },
                '& .MuiSelect-select': {
                  py: 0,
                  pl: 0.75,
                  pr: 2,
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: 0
                }
              }}>
              <Select<number>
                id={prioritySelectId}
                value={values.priority}
                onChange={(e) => {
                  void setFieldValue('priority', Number(e.target.value));
                }}
                renderValue={(v) => LIST_PRIORITY_COMPACT[Number(v)] ?? String(v)}
                displayEmpty
                inputProps={{ 'aria-label': 'List priority' }}
                MenuProps={{ PaperProps: { sx: { minWidth: 120 } } }}>
                {LIST_PRIORITY_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value} dense sx={{ fontSize: '0.8125rem', py: 0.5 }}>
                    <Box component="span" sx={{ mr: 1, fontFamily: 'monospace', color: 'text.secondary' }}>
                      {LIST_PRIORITY_COMPACT[opt.value]}
                    </Box>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
        <Field name="notes">
          {({ field }: FieldProps<string>) => (
            <TextField
              {...field}
              label="Notes"
              placeholder="Context, links, or reminders for this list…"
              multiline
              minRows={2}
              fullWidth
              size="small"
              sx={{ mt: 2 }}
              inputProps={{ 'aria-label': 'List notes' }}
            />
          )}
        </Field>
      </Form>
    </Paper>
  );
}

export function TodoListsEditor(props: TodoListsEditorProps) {
  const powerSync = usePowerSync();
  const userID = useUserId();
  const { listId } = props;

  const { data: todos } = useQuery<TodoRecord>(`SELECT * FROM todos WHERE list_uuid=? ORDER BY created_at, id`, [
    listId
  ]);

  const [newTodoText, setNewTodoText] = React.useState('');

  const toggleCompletion = async (record: TodoRecord, completed: boolean) => {
    if (!userID) {
      throw new Error(`Could not get user ID.`);
    }
    const completedAt = completed ? new Date().toISOString() : null;
    await powerSync.execute(
      `UPDATE todos
              SET
                  completed = ?,
                  completed_at = ?
              WHERE id = ?`,
      [completed ? 1 : 0, completedAt, record.id]
    );
  };

  const createNewTodo = async (description: string) => {
    if (!userID) {
      throw new Error(`Could not get user ID.`);
    }

    await powerSync.execute(
      `INSERT INTO
                todos
                    (id, created_at, description, list_uuid, completed)
                VALUES
                    (uuid(), datetime(), ?, ?, 0)`,
      [description, listId]
    );
  };

  const deleteTodo = async (id: string) => {
    await powerSync.writeTransaction(async (tx) => {
      await tx.execute(`DELETE FROM todos WHERE id = ?`, [id]);
    });
  };

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
        flex: 1,
        minHeight: 0,
        width: '100%'
      }}>
      <ListDetailsFields />

      <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, mb: 1, flexShrink: 0 }}>
        Todos
      </Typography>
      <Box
        sx={{
          flex: '1 1 auto',
          minHeight: 0,
          overflow: 'auto'
        }}>
        {todos.length === 0 ? (
          <Box
            sx={{
              minHeight: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              px: 2,
              py: 6,
              boxSizing: 'border-box'
            }}>
            <Typography variant="subtitle1" color="text.secondary" textAlign="center" sx={{ fontWeight: 700 }}>
              No todos yet
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ maxWidth: 360 }}>
              Add your first task with the field below. It syncs through PowerSync when you are online.
            </Typography>
          </Box>
        ) : (
          <List dense={false} sx={{ pb: 0 }}>
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
        )}
      </Box>
      <OutlinedComposer
        value={newTodoText}
        onChange={setNewTodoText}
        onSubmit={submitNewTodo}
        placeholder="Add a new todo"
        inputAriaLabel="New todo description"
        submitAriaLabel="Add todo"
        autoFocus
        formSx={{
          flexShrink: 0,
          pt: 1.5,
          pb: 0,
          width: '100%'
        }}
      />
    </Box>
  );
}
