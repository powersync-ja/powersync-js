import { TODO_LISTS_ROUTE } from '@/app/router';
import { formatListTaskSummary, listPriorityCaption } from '@/app/views/todo-lists/listFormUtils';
import type { TodoListWithCountsRow } from '@/library/powersync/AppSchema';
import { List, Paper, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ListItemWidget } from './ListItemWidget';

const ARCHIVED_AVATAR = '/thinking-dino.svg';

export type ArchivedTodoListsPanelProps = {
  /** Rows from `useQuery` (lists + per-list todo counts). */
  listRows: TodoListWithCountsRow[];
};

function normalizeCounts(row: TodoListWithCountsRow): { total: number; completed: number } {
  const total = Number(row.total_tasks) || 0;
  const completed = Number(row.completed_tasks ?? 0) || 0;
  return { total, completed };
}

export function ArchivedTodoListsPanel(props: ArchivedTodoListsPanelProps) {
  const { listRows } = props;
  const navigate = useNavigate();

  if (listRows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        No archived lists. Archive a list from its detail panel to see it here.
      </Typography>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.paper' }}>
      <List dense={false} disablePadding>
        {listRows.map((r) => {
          const { total, completed } = normalizeCounts(r);
          return (
            <ListItemWidget
              key={r.id}
              avatarSrc={ARCHIVED_AVATAR}
              title={r.name ?? ''}
              description={formatListTaskSummary(total, completed)}
              archived
              priorityLabel={listPriorityCaption(r.priority ?? undefined)}
              onPress={() => navigate(`${TODO_LISTS_ROUTE}/${r.id}`)}
            />
          );
        })}
      </List>
    </Paper>
  );
}
