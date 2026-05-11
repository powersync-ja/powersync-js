import { TODO_LISTS_ROUTE } from '@/app/router';
import { ARCHIVED_LIST_ROWS_WITH_COUNTS_SQL, type TodoListWithCountsRow } from '@/app/views/todo-lists/listQueries';
import { NavigationPage } from '@/components/navigation/NavigationPage';
import { ArchivedTodoListsPanel } from '@/components/widgets/ArchivedTodoListsPanel';
import { Box, Button, Typography } from '@mui/material';
import { useQuery } from '@powersync/react';
import { Link } from 'react-router-dom';

export default function TodoArchivedListsPage() {
  const { data: listRows } = useQuery<TodoListWithCountsRow>(ARCHIVED_LIST_ROWS_WITH_COUNTS_SQL);

  return (
    <NavigationPage title="Archived lists">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
            Lists you marked archived stay synced here. Open one to edit todos or turn archiving off from list
            details.
          </Typography>
          <Button component={Link} to={TODO_LISTS_ROUTE} variant="outlined" size="small">
            Back to active lists
          </Button>
        </Box>
        <ArchivedTodoListsPanel listRows={listRows} />
      </Box>
    </NavigationPage>
  );
}
