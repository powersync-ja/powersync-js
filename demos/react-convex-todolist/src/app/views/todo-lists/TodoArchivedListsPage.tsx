import { TODO_LISTS_ROUTE } from '@/app/router';
import { NavigationPage } from '@/components/navigation/NavigationPage';
import { SyncStreams } from '@/components/providers/SystemProvider';
import { ArchivedTodoListsPanel } from '@/components/widgets/ArchivedTodoListsPanel';
import { Database } from '@/library/powersync/AppSchema';
import { Box, Button, Typography } from '@mui/material';
import { useQuery } from '@powersync/react';
import { Link } from 'react-router-dom';

export type TodoListWithCountsRow = Database['lists'] & {
  total_tasks: number;
  completed_tasks: number;
};

export default function TodoArchivedListsPage() {
  const { data: listRows } = useQuery<TodoListWithCountsRow>(
    /* sql */ `
      SELECT
        lists.*,
        COUNT(todos.id) AS total_tasks,
        SUM(
          CASE
            WHEN COALESCE(todos.completed, 0) != 0 THEN 1
            ELSE 0
          END
        ) AS completed_tasks
      FROM
        lists
        LEFT JOIN todos ON lists.id = todos.list_uuid
      WHERE
        lists.archived = true
      GROUP BY
        lists.id
      ORDER BY
        COALESCE(lists.priority, 0) DESC,
        lists.created_at DESC
    `,
    [],
    {
      streams: [SyncStreams.archivedUserData]
    }
  );

  return (
    <NavigationPage title="Archived lists">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
            Lists you marked archived stay synced here. Open one to edit todos or turn archiving off from list details.
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
