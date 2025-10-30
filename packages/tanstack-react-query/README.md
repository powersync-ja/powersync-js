# TanStack Query Integration for PowerSync

`@powersync/tanstack-react-query` provides seamless integration between PowerSync's Web SDK and [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview) for React. It wraps TanStack's `useQuery` and `useSuspenseQuery` hooks to work easily with PowerSync's SQL queries. This combines PowerSync's existing watched queries with TanStack Query's features like the [paginated queries](https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries), [caching](https://tanstack.com/query/latest/docs/framework/react/guides/caching), and [Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense).

## Note: Alpha Release

This package is currently in an alpha release.

## Getting Started

To use `@powersync/tanstack-react-query`, you need to set up both the `PowerSyncContext` and the TanStack `QueryClientProvider` in your application.

```JSX
// App.jsx
import { PowerSyncDatabase } from '@powersync/web';
// or for React Native
// import { PowerSyncDatabase } from '@powersync/react-native';

import { PowerSyncContext } from "@powersync/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';


export const App = () => {
    const powerSync = React.useMemo(() => {
        // Set up PowerSync client
    }, [])
    const queryClient = React.useMemo(() => new QueryClient(), [])

  return (
    <PowerSyncContext.Provider value={powerSync}>
      <QueryClientProvider client={queryClient}>
        {/** Your components go here */}
      </QueryClientProvider>
    </PowerSyncContext.Provider>
  );
};
```

## Usage

### useQuery

The `useQuery` hook from `@powersync/tanstack-react-query` works similarly to the standard TanStack React Query `useQuery` hook but integrates with PowerSync for watched query functionality. Queries automatically update when dependent tables change.

```JSX
// TodoListDisplay.jsx
import { useQuery } from '@powersync/tanstack-react-query';

export const TodoListDisplay = () => {
  const { data: todoLists, isLoading, isFetching, error } = useQuery({
    queryKey: ['todoLists'],
    query: 'SELECT * FROM lists WHERE id = ?', // use `query` instead of `queryFn` to define a SQL query - this allows watching underlying tables for changes
    parameters: ['id-1'], // supply query parameters for the SQL query
  });

  if (isLoading) {
    return <div>Loading todo lists...</div>;
  }

  if (error) {
    return <div>Error loading todo lists: {error.message}</div>;
  }

  return (
    <ul>
      {todoLists?.map((list) => (
        <li key={list.id}>{list.name}</li>
      ))}
    </ul>
  );
};
```

### useSuspenseQuery

If you prefer to use React’s `Suspense` for data fetching, you can use the `useSuspenseQuery` hook.

```JSX
// TodoListDisplaySuspense.jsx
import { Suspense } from 'react';
import { useSuspenseQuery } from '@powersync/tanstack-react-query';

const TodoListContent = () => {
  const { data: todoLists } = useSuspenseQuery({
    queryKey: ['todoLists'],
    query: 'SELECT * FROM lists',
  });

  return (
    <ul>
      {todoLists.map((list) => (
        <li key={list.id}>{list.name}</li>
      ))}
    </ul>
  );
};


export const TodoListDisplaySuspense = () => {
  return (
    /* Will show fallback while query is loading */
    <Suspense fallback={<div>Loading todo lists...</div>}>
      <TodoListContent />
    </Suspense>
  );
};
```

### useQueries

The `useQueries` hook allows you to run multiple queries in parallel and combine the results into a single result.

```JSX
// TodoListDisplay.jsx
import { useQueries } from '@powersync/tanstack-react-query';

export const TodoListDisplay = () => {
  const { data: todoLists } = useQueries({
    queries: [
      { queryKey: ['todoLists'], query: 'SELECT * from lists' },
      { queryKey: ['todoLists2'], query: 'SELECT * from lists2' },
    ],
    combine: (results) => {
      return {
        data: results.map((result) => result.data),
        pending: results.some((result) => result.isPending),
      }
    },
  });

  return (
    <div>
      {todoLists.map((list) => (
        <li key={list.id}>{list.name}</li>
      ))}
    </div>
  );
};
```

### TypeScript Support

A type can be specified for each row returned by `useQuery` and `useSuspenseQuery`.

```TSX
// TodoListDisplay.tsx
const TodoListContent = () => {
const { data } = useQuery<{ id: string, name: string }>({
    queryKey: ['todoLists'],
     query: 'SELECT * FROM lists',
});

const { data: todoListsSuspense } = useSuspenseQuery<{ id: string, name: string }>({
    queryKey: ['todoListsSuspense'],
    query: 'SELECT * FROM lists',
});

return <></>
}
```

### Kysely Support

You are also able to use a compilable query (e.g. [Kysely queries](https://github.com/powersync-ja/powersync-js/tree/main/packages/kysely-driver)) as a query argument in place of a SQL statement string.

```TSX
// TodoListDisplay.tsx
import { useQuery } from '@powersync/tanstack-react-query';

export const TodoListDisplay = () => {
  const { data: todoLists, isLoading, error } = useQuery({
    queryKey: ['todoLists'],
    query: kyselyDb.selectFrom('lists').selectAll(), // The type of the rows in `data` are inferred from the Kysely query
  });

  if (isLoading) {
    return <div>Loading todo lists...</div>;
  }

  if (error) {
    return <div>Error loading todo lists: {error.message}</div>;
  }

  return (
    <ul>
      {todoLists?.map((list) => (
        <li key={list.id}>{list.name}</li>
      ))}
    </ul>
  );
};
```

### Drizzle Support

[Drizzle queries](https://github.com/powersync-ja/powersync-js/tree/main/packages/drizzle-driver) can be used with the `useQuery` and `useSuspenseQuery` hooks by converting them to a compilable query using the `toCompilableQuery` utility from `@powersync/drizzle-driver`.

```TSX
// TodoListDisplay.tsx
import { useQuery } from '@powersync/tanstack-react-query';
import { toCompilableQuery } from '@powersync/drizzle-driver';

export const TodoListDisplay = () => {
  const drizzleQuery = drizzleDb.select().from(lists);

  const { data: todoLists, isLoading, error } = useQuery({
    queryKey: ['todoLists'],
    query: toCompilableQuery(drizzleQuery), // The type of the rows in `data` are inferred from the Drizzle query
  });

  if (isLoading) {
    return <div>Loading todo lists...</div>;
  }

  if (error) {
    return <div>Error loading todo lists: {error.message}</div>;
  }

  return (
    <ul>
      {todoLists?.map((list) => (
        <li key={list.id}>{list.name}</li>
      ))}
    </ul>
  );
};
```

The `toCompilableQuery` function wraps your Drizzle query to make it compatible with useQuery and useSuspenseQuery.

For more information on using Drizzle with PowerSync, see the [Drizzle Driver documentation](https://github.com/powersync-ja/powersync-js/tree/main/packages/drizzle-driver).
