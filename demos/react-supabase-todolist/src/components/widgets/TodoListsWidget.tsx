import { LISTS_TABLE, ListRecord, TODOS_TABLE } from '@/library/powersync/AppSchema';
import { List } from '@mui/material';
import { useQuery } from '@powersync/react';
import { ArrayComparator } from '@powersync/web';
import { ListItemWidget } from './ListItemWidget';

export type TodoListsWidgetProps = {
  selectedId?: string;
};

const description = (total: number, completed: number = 0) => {
  return `${total - completed} pending, ${completed} completed`;
};

export function TodoListsWidget(props: TodoListsWidgetProps) {
  const { data: listRecords, isLoading } = useQuery<ListRecord & { total_tasks: number; completed_tasks: number }>(
    /* sql */ `
      SELECT
        ${LISTS_TABLE}.*,
        COUNT(${TODOS_TABLE}.id) AS total_tasks,
        SUM(
          CASE
            WHEN ${TODOS_TABLE}.completed = true THEN 1
            ELSE 0
          END
        ) as completed_tasks
      FROM
        ${LISTS_TABLE}
        LEFT JOIN ${TODOS_TABLE} ON ${LISTS_TABLE}.id = ${TODOS_TABLE}.list_id
      GROUP BY
        ${LISTS_TABLE}.id;
    `,
    [],
    {
      processor: {
        mode: 'comparison',
        comparator: new ArrayComparator({
          compareBy: (item) => JSON.stringify(item)
        })
      }
    }
  );

  if (isLoading) {
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
