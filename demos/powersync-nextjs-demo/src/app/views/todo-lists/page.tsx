'use client';
import _ from 'lodash';
import React from 'react';
import { useSupabase } from '@/components/providers/SystemProvider';
import { LISTS_TABLE, ListRecord, TODOS_TABLE } from '@/library/powersync/AppSchema';
import { usePowerSync, usePowerSyncWatchedQuery } from '@journeyapps/powersync-react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  TextField,
  styled
} from '@mui/material';
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';
import { ListItemWidget } from '@/components/widgets/ListItemWidget';
import { useRouter } from 'next/navigation';
import { NavigationPage } from '@/components/navigation/NavigationPage';

const description = (total: number, completed: number = 0) => {
  return `${total - completed} pending, ${completed} completed`;
};

export default function TodoListsPage() {
  const powerSync = usePowerSync();
  const supabase = useSupabase();
  const router = useRouter();

  const listRecords = usePowerSyncWatchedQuery<ListRecord & { total_tasks: number; completed_tasks: number }>(`
      SELECT 
        ${LISTS_TABLE}.*, COUNT(${TODOS_TABLE}.id) AS total_tasks, SUM(CASE WHEN ${TODOS_TABLE}.completed = true THEN 1 ELSE 0 END) as completed_tasks
      FROM 
        ${LISTS_TABLE}
      LEFT JOIN ${TODOS_TABLE} 
        ON  ${LISTS_TABLE}.id = ${TODOS_TABLE}.list_id
      GROUP BY 
        ${LISTS_TABLE}.id;
      `);

  const [showPrompt, setShowPrompt] = React.useState(false);
  const nameInputRef = React.createRef<HTMLInputElement>();

  const createNewList = async (name: string) => {
    const session = await supabase?.client.auth.getSession();
    const userID = session?.data.session?.user?.id;
    if (!userID) {
      throw new Error(`Could not create new lists, no userID found`);
    }

    const res = await powerSync.execute(
      `INSERT INTO ${LISTS_TABLE} (id, created_at, name, owner_id) VALUES (uuid(), datetime(), ?, ?) RETURNING *`,
      [name, userID]
    );

    const resultRecord = res.rows?.item(0);
    if (!resultRecord) {
      throw new Error('Could not create list');
    }
  };

  const deleteList = async (id: string) => {
    await powerSync.writeTransaction(async (tx) => {
      // Delete associated todos
      await tx.execute(`DELETE FROM ${TODOS_TABLE} WHERE list_id = ?`, [id]);
      // Delete list record
      await tx.execute(`DELETE FROM ${LISTS_TABLE} WHERE id = ?`, [id]);
    });
  };

  return (
    <NavigationPage title="Todo Lists">
      <Box>
        <S.FloatingActionButton onClick={() => setShowPrompt(true)}>
          <AddIcon />
        </S.FloatingActionButton>
        <Box>
          <List dense={false}>
            {listRecords.map((r) => (
              <ListItemWidget
                key={r.id}
                title={r.name}
                description={description(r.total_tasks, r.completed_tasks)}
                onDelete={() => deleteList(r.id)}
                onPress={() => {
                  router.push(`/views/todo-lists/edit?id=${r.id}`);
                }}
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
          <DialogTitle id="alert-dialog-title">{'Create Todo List'}</DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">Enter a name for a new todo list</DialogContentText>
            <TextField sx={{ marginTop: '10px' }} fullWidth inputRef={nameInputRef} label="Name" autoFocus />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowPrompt(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                await createNewList(nameInputRef.current!.value);
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
}

namespace S {
  export const FloatingActionButton = styled(Fab)`
    position: absolute;
    bottom: 20px;
    right: 20px;
  `;
}
