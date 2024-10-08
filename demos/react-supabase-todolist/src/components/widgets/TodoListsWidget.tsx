import { usePowerSync, useQuery } from '@powersync/react';
import { List, TextField } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ListItemWidget } from './ListItemWidget';
import { LISTS_TABLE, ListRecord, TODOS_TABLE } from '@/library/powersync/AppSchema';
import { TODO_LISTS_ROUTE } from '@/app/router';
import React, { createContext, Suspense, useEffect } from 'react';
import { QueryResult } from '@powersync/react/lib/hooks/useQuery';
import { ErrorBoundary } from 'react-error-boundary';

export type TodoListsWidgetProps = {
  selectedId?: string;
};

const description = (total: number, completed: number = 0) => {
  return `${total - completed} pending, ${completed} completed`;
};

export const queryCache = new Map<string, { promise: Promise<any>; resolved: boolean; data?: any[]; error?: Error }>();

const TContext = createContext(queryCache);

export const useT = () => React.useContext(TContext);

const TodoListContent = () => {
  const powerSync = usePowerSync();
  const cache = useT();

  const key = 'key';
  if (!cache.has(key)) {
    const p = new Promise<any[]>(async (resolve, reject) => {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const data = await powerSync.getAll<any>('sele');
        resolve(data);
      } catch (e) {
        reject(e);
      }
    });

    const queryTracker = {
      promise: p,
      resolved: false,
      data: undefined as any[] | undefined,
      error: undefined as Error | undefined
    };
    p.then((data) => {
      queryTracker.data = data;
    })
      .catch((e) => {
        queryTracker.error = e;
      })
      .finally(() => (queryTracker.resolved = true));

    cache.set(key, queryTracker);

    throw p;
  }

  const cacheEntry = cache.get(key);
  if (!cacheEntry?.resolved) {
    throw cacheEntry?.promise;
  }

  if (cacheEntry.error) {
    throw cacheEntry.error;
  }

  return <div>Hell, {cacheEntry.data?.toString()}</div>;
};

export const TodoListsWidget = () => {
  return (
    <ErrorBoundary fallbackRender={({ error }) => <div>Something went wrong {error.message}</div>}>
      <Suspense fallback={<div>Loading todo lists...</div>}>
        <TodoListContent />
      </Suspense>
    </ErrorBoundary>
  );
};

export function TodoListsWidgexxt(props: TodoListsWidgetProps) {
  const powerSync = usePowerSync();
  const navigate = useNavigate();

  const inputRef = React.useRef<HTMLInputElement>();

  const [text, setText] = React.useState('select * from lists');
  const { data, isFetching, isLoading } = useQuery<{ id: string; name: string }>(text);
  console.log('isFetching', isFetching);
  // const { data: listRecords, isLoading } = useQuery<ListRecord & { total_tasks: number; completed_tasks: number }>(`
  //     SELECT
  //       ${LISTS_TABLE}.*, COUNT(${TODOS_TABLE}.id) AS total_tasks, SUM(CASE WHEN ${TODOS_TABLE}.completed = true THEN 1 ELSE 0 END) as completed_tasks
  //     FROM
  //       ${LISTS_TABLE}
  //     LEFT JOIN ${TODOS_TABLE}
  //       ON  ${LISTS_TABLE}.id = ${TODOS_TABLE}.list_id
  //     GROUP BY
  //       ${LISTS_TABLE}.id;
  //     `);

  // const deleteList = async (id: string) => {
  //   await powerSync.writeTransaction(async (tx) => {
  //     // Delete associated todos
  //     await tx.execute(`DELETE FROM ${TODOS_TABLE} WHERE list_id = ?`, [id]);
  //     // Delete list record
  //     await tx.execute(`DELETE FROM ${LISTS_TABLE} WHERE id = ?`, [id]);
  //   });
  // };

  return (
    <ul>
      {isFetching ? <div>busy</div> : <></>}
      {/* <TextField inputRef={inputRef} onChange={() => setText(inputRef.current?.value.toString() || '')} /> */}
      <button onClick={() => setText('select * from todos')}>New query</button>
      {data.map((d) => (
        <li key={d.id}>{d.id}</li>
      ))}
    </ul>
  );
  // if (isLoading) {
  //   return <div>Loading...</div>;
  // }

  // return (
  //   <List dense={false}>
  //     {listRecords.map((r) => (
  //       <ListItemWidget
  //         key={r.id}
  //         title={r.name ?? ''}
  //         description={description(r.total_tasks, r.completed_tasks)}
  //         selected={r.id == props.selectedId}
  //         onDelete={() => deleteList(r.id)}
  //         onPress={() => {
  //           navigate(TODO_LISTS_ROUTE + '/' + r.id);
  //         }}
  //       />
  //     ))}
  //   </List>
  // );
}
