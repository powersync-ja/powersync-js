import { TODO_LISTS_ROUTE } from '@/app/router';
import { LISTS_TABLE, ListRecord, TODOS_TABLE } from '@/library/powersync/AppSchema';
import { usePowerSync, usePowerSyncWatchedQuery } from "@journeyapps/powersync-react";
import { List } from "@mui/material";
import { useNavigate } from 'react-router-dom';
import { ListItemWidget } from "./ListItemWidget";
import { AbstractPowerSyncDatabase, QueryWithResult } from '@journeyapps/powersync-sdk-web';

export type TodoListsWidgetProps = {
  selectedId?: string;
  lists: QueryWithResult<ListRecord & { total_tasks: number; completed_tasks: number }>
}

const description = (total: number, completed: number = 0) => {
  return `${total - completed} pending, ${completed} completed`;
};

export const loadTodoLists = async (db: AbstractPowerSyncDatabase) => {
  return await db.query<ListRecord & { total_tasks: number; completed_tasks: number }>(`
    SELECT 
      ${LISTS_TABLE}.*, COUNT(${TODOS_TABLE}.id) AS total_tasks, SUM(CASE WHEN ${TODOS_TABLE}.completed = true THEN 1 ELSE 0 END) as completed_tasks
    FROM 
      ${LISTS_TABLE}
    LEFT JOIN ${TODOS_TABLE} 
      ON  ${LISTS_TABLE}.id = ${TODOS_TABLE}.list_id
    GROUP BY 
      ${LISTS_TABLE}.id;
    `).preload();
}

export function TodoListsWidget(props: TodoListsWidgetProps) {
  const powerSync = usePowerSync();
  const navigate = useNavigate();

  const listRecords = usePowerSyncWatchedQuery(props.lists);

  const deleteList = async (id: string) => {
    await powerSync.writeTransaction(async (tx) => {
      // Delete associated todos
      await tx.execute(`DELETE FROM ${TODOS_TABLE} WHERE list_id = ?`, [id]);
      // Delete list record
      await tx.execute(`DELETE FROM ${LISTS_TABLE} WHERE id = ?`, [id]);
    });
  };

  return (
    <List dense={false}>
      {listRecords.map((r) => (
        <ListItemWidget
          key={r.id}
          title={r.name ?? ''}
          description={description(r.total_tasks, r.completed_tasks)}
          selected={r.id == props.selectedId}
          onDelete={() => deleteList(r.id)}
          onPress={() => {
            navigate(TODO_LISTS_ROUTE + '/' + r.id)
          }}
        />
      ))}
    </List>
  );
}