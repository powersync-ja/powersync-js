import { usePowerSync, useQuery, useStatus, useSyncStream } from '@powersync/react';
import { createFileRoute } from '@tanstack/react-router';

import { SyncStreamGuard } from '../components/StreamSyncGuard';
import { ReactNode, useMemo } from 'react';
import { SyncStatus } from '../components/SyncStatus';
import { Window } from '@tauri-apps/api/window';
import { Webview } from '@tauri-apps/api/webview';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

export const Route = createFileRoute('/')({
  component: ListsComponent
});

function ListsComponent() {
  return (
    <div>
      <SyncStatus />
      <h3>Todo Lists</h3>
      <SyncStreamGuard stream={{ name: 'lists', parameters: null }}>
        <ListsQuery />
      </SyncStreamGuard>
    </div>
  );
}

interface ListEntry {
  id: string;
  name: string;
}

function ListsQuery(): ReactNode {
  const { data } = useQuery<ListEntry>('SELECT * FROM lists ORDER BY created_at');

  if (data.length == 0) {
    return 'No lists found';
  }

  return (
    <ul>
      {data.map(({ id, name }) => (
        <li key={id}>
          <ListsEntry id={id} name={name} />
        </li>
      ))}
    </ul>
  );
}

function ListsEntry({ id, name }: ListEntry): ReactNode {
  const db = usePowerSync();
  const stream = useMemo(() => db.syncStream('todos', { list: id }), [id]);
  const status = useStatus().forStream(stream);

  let statusDescription: ReactNode = 'Contents of this list are not yet available offline. Open the list to sync it.';
  if (status?.subscription.hasSynced) {
    statusDescription = <ItemsInList id={id} />;
  }

  function open() {
    const window = new WebviewWindow(`list-content-${id}`, {
      // TODO: There's no way this works outside of the development server.
      url: `/list/${id}`,

      // create a webview with specific logical position and size
      x: 0,
      y: 0,
      width: 800,
      height: 600
    });
  }

  return (
    <div>
      <h4>{name}</h4>
      <button onClick={open}>Open in new window</button>
      <div>{statusDescription}</div>
    </div>
  );
}

function ItemsInList({ id }: { id: string }): ReactNode {
  const query = useQuery<{ completed: number; count: number }>(
    'SELECT completed, COUNT(*) AS count FROM todos WHERE list_id = ? GROUP BY completed',
    [id]
  );

  let completedCount: number = 0;
  let pendingCount: number = 0;
  for (const { completed, count } of query.data) {
    if (completed) {
      completedCount = count;
    } else {
      pendingCount = count;
    }
  }

  return (
    <span>
      {completedCount} completed and {pendingCount} pending items
    </span>
  );
}
