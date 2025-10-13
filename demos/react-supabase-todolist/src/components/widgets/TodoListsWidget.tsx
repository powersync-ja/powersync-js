import { List } from '@mui/material';
import { useWatchedQuerySubscription } from '@powersync/react';
import { useQueryStore } from '../providers/SystemProvider';
import { ListItemWidget } from './ListItemWidget';

export type TodoListsWidgetProps = {
  selectedId?: string;
};

const description = (total: number, completed: number = 0) => {
  return `${total - completed} pending, ${completed} completed`;
};

export function TodoListsWidget(props: TodoListsWidgetProps) {
  const queries = useQueryStore();
  const { data: listRecords, isLoading } = useWatchedQuerySubscription(queries!.lists);

  if (isLoading && listRecords.length == 0) {
    return <div>Loading...</div>;
  }

  return (
    <List dense={false}>
      {listRecords.map((r) => (
        <ListItemWidget
          key={r.id}
          id={r.id}
          title={r.name ?? ''}
          description={description(r.total_tasks, r.completed_tasks)}
          selected={r.id == props.selectedId}
        />
      ))}
    </List>
  );
}
