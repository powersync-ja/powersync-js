import { TODO_LISTS_ROUTE } from '@/app/router';
import { NavigationPage } from '@/components/navigation/NavigationPage';
import { ArchivedTodoListsPanel } from '@/components/widgets/ArchivedTodoListsPanel';
import { LISTS_TABLE, TodoListWithCountsRow, TODOS_TABLE } from '@/library/powersync/AppSchema';
import { Box, Button, Typography } from '@mui/material';
import { useQuery } from '@powersync/react';
import { Link } from 'react-router-dom';

export default function TodoArchivedListsPage() {
  const { data: listRows } = useQuery<TodoListWithCountsRow>(
    /* sql */ `
      SELECT
        ${LISTS_TABLE}.*,
        COUNT(${TODOS_TABLE}.id) AS total_tasks,
        SUM(
          CASE
            WHEN COALESCE(${TODOS_TABLE}.completed, 0) != 0 THEN 1
            ELSE 0
          END
        ) AS completed_tasks
      FROM
        ${LISTS_TABLE}
        LEFT JOIN ${TODOS_TABLE} ON ${LISTS_TABLE}.id = ${TODOS_TABLE}.list_uuid
      WHERE
        ${LISTS_TABLE}.archived = true
      GROUP BY
        ${LISTS_TABLE}.id
      ORDER BY
        COALESCE(${LISTS_TABLE}.priority, 0) DESC,
        ${LISTS_TABLE}.created_at DESC
    `,
    [],
    {
      streams: [
        {
          name: 'archived_user_data'
        }
      ]
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
