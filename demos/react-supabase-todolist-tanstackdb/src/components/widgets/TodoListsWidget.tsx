import { List } from '@mui/material';
import { count, eq, sum, useLiveQuery } from '@tanstack/react-db';
import { listsCollection, todosCollection } from '../providers/SystemProvider';
import { ListItemWidget } from './ListItemWidget';

export type TodoListsWidgetProps = {
  selectedId?: string;
};

const description = (total: number, completed: number = 0) => {
  return `${total - completed} pending, ${completed} completed`;
};

export function TodoListsWidget(props: TodoListsWidgetProps) {
  const { isLoading, data, isError, isReady, status } = useLiveQuery((q) =>
    q
      .from({ lists: listsCollection })
      .leftJoin({ todos: todosCollection }, ({ lists, todos }) => eq(lists.id, todos.list_id))
      .groupBy(({ lists }) => [lists.id, lists.name])
      .select(({ lists, todos }) => ({
        id: lists.id,
        name: lists.name,
        total_tasks: count(todos?.id),
        completed_tasks: sum(todos?.completed as number)
      }))
  );

  if (isLoading || !isReady) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>Error: {status}</div>;
  }

  return (
    <List dense={false}>
      {data.map((r) => (
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
