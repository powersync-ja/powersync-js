import { useQuery, useSyncStream } from '@powersync/react';
import { createFileRoute } from '@tanstack/react-router';

import { SyncStreamGuard } from '../components/StreamSyncGuard';
import { ReactNode } from 'react';

export const Route = createFileRoute('/')({
  component: ListsComponent
});

function ListsComponent() {
  return (
    <div>
      <h3>Todo Lists</h3>

      <SyncStreamGuard stream={{ name: 'lists', parameters: null }}>
        <ListsQuery />
      </SyncStreamGuard>
    </div>
  );
}

function ListsQuery(): ReactNode {
  const { data } = useQuery<{ id: string; name: string }>('SELECT * FROM lists ORDER BY created_at');

  if (data.length == 0) {
    return 'Loading lists';
  }

  return (
    <ul>
      {data.map((list) => (
        <li key={list.id}>
          <h4>{list.name}</h4>
        </li>
      ))}
    </ul>
  );
}
