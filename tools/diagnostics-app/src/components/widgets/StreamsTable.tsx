import { connect, db } from '@/library/powersync/ConnectionManager';
import { SyncStreamStatus } from '@powersync/web';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { Trash2 } from 'lucide-react';

export function StreamsTable(props: { streams: SyncStreamStatus[] }) {
  const [unsubscribing, setUnsubscribing] = useState<string | null>(null);

  const handleUnsubscribe = async (name: string, parameters: string) => {
    const id = `${name}-${parameters}`;
    setUnsubscribing(id);
    try {
      const params = parameters === 'null' ? null : JSON.parse(parameters);
      await db.syncStream(name, params).unsubscribeAll();
      try {
        await connect();
      } catch {
        // Reconnection may fail if credentials have expired
      }
    } finally {
      setUnsubscribing(null);
    }
  };

  const columns: DataTableColumn<any>[] = [
    { field: 'name', headerName: 'Stream Name', flex: 2 },
    { field: 'parameters', headerName: 'Parameters', flex: 3, hideOnMobile: true },
    { field: 'default', headerName: 'Default', flex: 1, type: 'boolean', hideOnMobile: true },
    { field: 'active', headerName: 'Active', flex: 1, type: 'boolean' },
    { field: 'has_explicit_subscription', headerName: 'Explicit', flex: 1, type: 'boolean', hideOnMobile: true },
    { field: 'priority', headerName: 'Priority', flex: 1, type: 'number', hideOnMobile: true },
    { field: 'last_synced_at', headerName: 'Last Synced', flex: 2, type: 'dateTime', hideOnMobile: true },
    { field: 'expires', headerName: 'Eviction Time', flex: 2, type: 'dateTime', hideOnMobile: true },
    {
      field: 'actions',
      headerName: '',
      flex: 0.5,
      renderCell: ({ row }) =>
        row.has_explicit_subscription ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            disabled={unsubscribing === row.id}
            onClick={() => handleUnsubscribe(row.name, row.parameters)}
            title="Unsubscribe">
            {unsubscribing === row.id ? <Spinner size="sm" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        ) : null
    }
  ];

  const rows = props.streams.map((stream) => {
    const name = stream.subscription.name;
    const parameters = JSON.stringify(stream.subscription.parameters);

    return {
      id: `${name}-${parameters}`,
      name,
      parameters,
      default: stream.subscription.isDefault,
      has_explicit_subscription: stream.subscription.hasExplicitSubscription,
      active: stream.subscription.active,
      last_synced_at: stream.subscription.lastSyncedAt,
      expires: stream.subscription.expiresAt,
      priority: stream.priority
    };
  });

  return <DataTable rows={rows} columns={columns} pageSize={10} pageSizeOptions={[10, 50, 100]} />;
}
