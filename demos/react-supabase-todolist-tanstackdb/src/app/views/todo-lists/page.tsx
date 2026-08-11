import { NavigationPage } from '@/components/navigation/NavigationPage';
import { useAttachments } from '@/components/providers/AttachmentsProvider';
import { listsCollection, useSupabase } from '@/components/providers/SystemProvider';
import { GuardBySync } from '@/components/widgets/GuardBySync';
import { SearchBarWidget } from '@/components/widgets/SearchBarWidget';
import { TodoListsWidget } from '@/components/widgets/TodoListsWidget';
import AddIcon from '@mui/icons-material/Add';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  styled
} from '@mui/material';
import Fab from '@mui/material/Fab';
import React from 'react';

export default function TodoListsPage() {
  const supabase = useSupabase();
  const attachments = useAttachments();

  const [showPrompt, setShowPrompt] = React.useState(false);
  const nameInputRef = React.createRef<HTMLInputElement>();

  const createNewList = async (name: string) => {
    const session = await supabase?.client.auth.getSession();
    const userID = session?.data.session?.user?.id;
    if (!userID) {
      throw new Error(`Could not create new lists, no userID found`);
    }

    if (attachments) {
      // Attachments are enabled: create the list together with a photo attachment
      // in a single transaction, associating them via `photo_id`.
      await attachments.queue.saveFileTanStack({
        // This is just random file data for this poc, this could be an image from a camera etc
        data: btoa(crypto.randomUUID()),
        fileExtension: 'jpg',
        updateHook: async (attachmentRecord) => {
          // This should happen in the same transaction as creating the attachment
          listsCollection.insert({
            id: crypto.randomUUID(),
            name,
            created_at: new Date(),
            owner_id: userID,
            photo_id: attachmentRecord.id // make the association for related data
          });
        }
      });
    } else {
      // No attachments configured: create the list on its own.
      await listsCollection.insert({
        id: crypto.randomUUID(),
        name,
        created_at: new Date(),
        owner_id: userID,
        photo_id: null
      }).isPersisted.promise;
    }
  };

  return (
    <NavigationPage title="Todo Lists">
      <Box>
        <S.FloatingActionButton onClick={() => setShowPrompt(true)}>
          <AddIcon />
        </S.FloatingActionButton>
        <Box>
          <SearchBarWidget />
          <GuardBySync>
            <TodoListsWidget />
          </GuardBySync>
        </Box>
        {/* TODO use a dialog service in future, this is just a simple example app */}
        <Dialog
          open={showPrompt}
          onClose={() => setShowPrompt(false)}
          PaperProps={{
            component: 'form',
            onSubmit: async (event: React.FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              await createNewList(nameInputRef.current!.value);
              setShowPrompt(false);
            }
          }}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description">
          <DialogTitle id="alert-dialog-title">{'Create Todo List'}</DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">Enter a name for a new todo list</DialogContentText>
            <TextField sx={{ marginTop: '10px' }} fullWidth inputRef={nameInputRef} label="List Name" autoFocus />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowPrompt(false)}>Cancel</Button>
            <Button type="submit">Create</Button>
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
