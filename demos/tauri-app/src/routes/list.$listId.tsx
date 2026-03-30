import { usePowerSync, useQuery } from '@powersync/react';
import { createFileRoute } from '@tanstack/react-router';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ReactNode, useEffect, useId } from 'react';
import { SyncStreamGuard } from '../components/StreamSyncGuard';

export const Route = createFileRoute('/list/$listId')({
  component: RouteComponent
});

function RouteComponent() {
  const { listId } = Route.useParams();
  const listData = useQuery<{ name: string }>('SELECT name FROM lists WHERE id = ?', [listId]);
  const listName = listData.data[0]?.name;

  useEffect(() => {
    if (listName) {
      getCurrentWindow().setTitle(`List ${listName}`);
    }
  }, [listName]);

  const stream = {
    name: 'todos',
    parameters: { list: listId },
    waitForStream: true
  };
  const associatedTodos = useQuery<{ id: string; description: string; completed: number }>(
    'SELECT * FROM todos WHERE list_id = ? ORDER BY created_at',
    [listId],
    {
      streams: [stream]
    }
  );

  return (
    <div>
      <h2>List {listName}</h2>
      <SyncStreamGuard stream={stream}>
        <ul>
          {associatedTodos.data.map((row) => {
            return (
              <li key={row.id}>
                <TodoItem id={row.id} description={row.description} completed={row.completed} />
              </li>
            );
          })}
        </ul>
      </SyncStreamGuard>
    </div>
  );
}

function TodoItem(props: { id: string; description: string; completed: number }): ReactNode {
  const id = useId();
  const db = usePowerSync();

  function toggle() {
    db.execute('UPDATE todos SET completed = NOT completed WHERE id = ?', [props.id]);
  }

  return (
    <div>
      <input type="checkbox" id={id} name="scales" onChange={toggle} checked={props.completed != 0} />
      <label htmlFor={id}>{props.description}</label>
    </div>
  );
}
