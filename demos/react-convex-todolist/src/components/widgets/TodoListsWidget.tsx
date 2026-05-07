import { TODO_LISTS_ROUTE } from '@/app/router';
import { LISTS_TABLE, ListRecord, TODOS_TABLE } from '@/library/powersync/AppSchema';
import { List, Paper, Typography, styled } from '@mui/material';
import { usePowerSync, useQuery } from '@powersync/react';
import { useNavigate } from 'react-router-dom';
import { ListItemWidget } from './ListItemWidget';

export type TodoListsWidgetProps = {
  selectedId?: string;
};

const description = (total: number, completed: number = 0) => {
  return `${total - completed} pending, ${completed} completed`;
};

export function TodoListsWidget(props: TodoListsWidgetProps) {
  const powerSync = usePowerSync();
  const navigate = useNavigate();

  const { data: listRecords } = useQuery<ListRecord & { total_tasks: number; completed_tasks: number }>(`
      SELECT 
        ${LISTS_TABLE}.*, COUNT(${TODOS_TABLE}.id) AS total_tasks, SUM(CASE WHEN ${TODOS_TABLE}.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
      FROM 
        ${LISTS_TABLE}
      LEFT JOIN ${TODOS_TABLE} 
        ON  ${LISTS_TABLE}.id = ${TODOS_TABLE}.list_uuid
      GROUP BY 
        ${LISTS_TABLE}.id;
      `);

  const deleteList = async (id: string) => {
    await powerSync.writeTransaction(async (tx) => {
      // Delete associated todos
      await tx.execute(`DELETE FROM ${TODOS_TABLE} WHERE list_uuid = ?`, [id]);
      // Delete list record
      await tx.execute(`DELETE FROM ${LISTS_TABLE} WHERE id = ?`, [id]);
    });
  };

  return (
    <List dense={false} disablePadding>
      {listRecords.length === 0 ? (
        <S.EmptyState elevation={0}>
          <Typography variant="h6">No lists yet</Typography>
          <Typography color="text.secondary">Create your first todo list to see PowerSync in action.</Typography>
        </S.EmptyState>
      ) : (
        listRecords.map((r) => (
          <ListItemWidget
            key={r.id}
            title={r.name ?? ''}
            description={description(r.total_tasks, r.completed_tasks)}
            selected={r.id == props.selectedId}
            onDelete={() => deleteList(r.id)}
            onPress={() => {
              navigate(TODO_LISTS_ROUTE + '/' + r.id);
            }}
          />
        ))
      )}
    </List>
  );
}

namespace S {
  export const EmptyState = styled(Paper)`
    padding: 28px;
    border: 1px dashed ${({ theme }) => theme.palette.divider};
    text-align: center;
  `;
}
