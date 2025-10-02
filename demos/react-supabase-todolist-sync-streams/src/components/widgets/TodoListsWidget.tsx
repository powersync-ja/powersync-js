import { List } from '@mui/material';
import { usePowerSync, useStatus, useWatchedQuerySubscription } from '@powersync/react';
import { useQueryStore } from '../providers/SystemProvider';
import { ListItemWidget } from './ListItemWidget';

export type TodoListsWidgetProps = {
  selectedId?: string;
};

const description = (total: number, completed: number = 0) => {
  return `${total - completed} pending, ${completed} completed`;
};

export function TodoListsWidget(props: TodoListsWidgetProps) {
  const db = usePowerSync();
  const status = useStatus();
  const queries = useQueryStore();
  const { data: listRecords, isLoading } = useWatchedQuerySubscription(queries!.lists);

  if (isLoading && listRecords.length == 0) {
    return <div>Loading...</div>;
  }

  return (
    <List dense={false}>
      {listRecords.map((r) => {
        const listStatus = status.forStream({ name: 'todos', parameters: { list: r.id } });
        let listDescription = '';
        if (listStatus == null || !listStatus.subscription.active) {
          listDescription = 'Items in this list not loaded - open list for details.';
        } else if (!listStatus.subscription.hasSynced) {
          listDescription = 'Loading items in this list...';
        } else {
          listDescription = description(r.total_tasks, r.completed_tasks);
        }

        return (
          <ListItemWidget
            key={r.id}
            id={r.id}
            title={r.name ?? ''}
            description={listDescription}
            selected={r.id == props.selectedId}
          />
        );
      })}
    </List>
  );
}
