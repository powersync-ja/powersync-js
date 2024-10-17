# React Hooks for PowerSync

The `powersync/react` package provides React hooks for use with the JavaScript Web SDK or React Native SDK. These hooks are designed to support reactivity, and can be used to automatically re-render React components when query results update or to access PowerSync connectivity status changes.

## Usage

### Context

Configure a PowerSync DB connection and add it to a context provider.

```JSX
// App.jsx
import { PowerSyncDatabase } from '@powersync/web';
// or for React Native
// import { PowerSyncDatabase } from '@powersync/react-native';
import { PowerSyncContext } from "@powersync/react";
export const App = () => {
    const powerSync = React.useMemo(() => {
        // Setup PowerSync client
    }, [])

    return <PowerSyncContext.Provider value={powerSync}>
        {/** Insert your components here */ }
    </PowerSyncContext.Provider>
}
```

### Accessing PowerSync

The provided PowerSync client is available with the `usePowerSync` hook.

```JSX
// TodoListDisplay.jsx
import { usePowerSync } from "@powersync/react";

export const TodoListDisplay = () => {
    const powersync = usePowerSync();

    const [lists, setLists] = React.useState([]);

    React.useEffect(() => {
        powersync.getAll('SELECT * from lists').then(setLists)
    }, []);

    return <ul>
        {lists.map(list => <li key={list.id}>{list.name}</li>)}
    </ul>
    }
```

## Accessing PowerSync Status

The provided PowerSync client status is available with the `useStatus` hook.

```JSX
import { useStatus } from "@powersync/react";

const Component = () => {
  const status = useStatus();

  return (
    <>
      <div>{status.connected ? 'wifi' : 'wifi-off'}</div>
      <div>{!status.hasSynced ? 'Busy syncing...' : 'Data is here'}</div>
    </>
  )
};
```

## Reactive Queries

The `useQuery` hook allows you to access the results of a watched query. Queries will automatically update when a dependant table is updated unless you set the `runQueryOnce` flag. You are also able to use a compilable query (e.g. [Kysely queries](https://github.com/powersync-ja/powersync-js/tree/main/packages/kysely-driver)) as a query argument in place of a SQL statement string.

```JSX
// TodoListDisplay.jsx
import { useQuery } from "@powersync/react";

export const TodoListDisplay = () => {
    const { data: todoLists } = useQuery('SELECT * FROM lists WHERE id = ?', ['id-1'], {runQueryOnce: false});

    return <View>
      {todoLists.map((l) => (
        <Text key={l.id}>{JSON.stringify(l)}</Text>
      ))}
    </View>
}
```

### Query Loading

The response from `useQuery` includes the `isLoading` and `isFetching` properties, which indicate the current state of data retrieval. This can be used to show loading spinners or conditional widgets.

```JSX
// TodoListDisplay.jsx
import { useQuery } from "@powersync/react";

export const TodoListsDisplayDemo = () => {
  const { data: todoLists, isLoading, isFetching } = useQuery('SELECT * FROM lists');
  return (
    <div>
      <h1>Todo Lists {isFetching ? '⟳' : ''}</h1>
      <div
        style={{
          opacity: isLoading ? 1 : 0,
          transition: 'opacity 0.5s ease-in-out'
        }}>
        Loading todo lists...
      </div>
      <ul
        style={{
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 1s ease-in-out'
        }}>
        {todoLists.map(() => (
          <li key={l.id}>{JSON.stringify(l)}</li>
        ))}
      </ul>
    </div>
  );
};

```

### Suspense

The `useSuspenseQuery` hook also allows you to access the results of a watched query, but its loading and fetching states are handled through [Suspense](https://react.dev/reference/react/Suspense). Unlike `useQuery`, the hook doesn't return `isLoading` or `isFetching` for the loading states nor `error` for the error state. These should be handled with variants of `<Suspense>` and `<ErrorBoundary>` respectively.

```JSX
// TodoListDisplaySuspense.jsx
import { ErrorBoundary } from 'react-error-boundary';
import { Suspense } from 'react';
import { useSuspenseQuery } from '@powersync/react';

const TodoListContent = () => {
  const { data: todoLists } = useSuspenseQuery("SELECT * FROM lists");

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
  <ErrorBoundary fallback={<div>Something went wrong</div>}>
    <Suspense fallback={<div>Loading todo lists...</div>}>
      <TodoListContent />
    </Suspense>
  </ErrorBoundary>
  );
};
```

#### Blocking navigation on Suspense

When you provide a Suspense fallback, suspending components will cause the fallback to render. Alternatively, React's [startTransition](https://react.dev/reference/react/startTransition) allows navigation to be blocked until the suspending components have completed, preventing the fallback from displaying. This behavior can be facilitated by your router — for example, react-router supports this with its [startTransition flag](https://reactrouter.com/en/main/upgrading/future#v7_starttransition).

> Note: In this example, the `<Suspense>` boundary is intentionally omitted to delegate the handling of the suspending state to the router.

```JSX
// routerAndLists.jsx
import { RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { useSuspenseQuery } from '@powersync/react';

export const Index() {
  return <RouterProvider router={router} future={{v7_startTransition: true}} />
}

const TodoListContent = () => {
  const { data: todoLists } = useSuspenseQuery("SELECT * FROM lists");

  return (
    <ul>
      {todoLists.map((list) => (
        <li key={list.id}>{list.name}</li>
      ))}
    </ul>
  );
};


export const TodoListsPage = () => {
  return (
  <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <TodoListContent />
  </ErrorBoundary>
  );
};
```

#### Managing Suspense When Updating `useSuspenseQuery` Parameters

When data in dependent tables changes, `useSuspenseQuery` automatically updates without suspending. However, changing the query parameters causes the hook to restart and enter a suspending state again, which triggers the suspense fallback. To prevent this and keep displaying the stale data until the new data is loaded, wrap the parameter changes in React's [startTransition](https://react.dev/reference/react/startTransition) or use [useDeferredValue](https://react.dev/reference/react/useDeferredValue).

```JSX
// TodoListDisplaySuspenseTransition.jsx
import { ErrorBoundary } from 'react-error-boundary';
import React, { Suspense } from 'react';
import { useSuspenseQuery } from '@powersync/react';

const TodoListContent = () => {
  const [query, setQuery] = React.useState('SELECT * FROM lists');
  const { data: todoLists } = useSuspenseQuery(query);

  return (
    <div>
      <button
        onClick={() => {
          React.startTransition(() => setQuery('SELECT * from lists limit 1'));
        }}>
        Update
      </button>
      <ul>
        {todoLists.map((list) => (
          <li key={list.id}>{list.name}</li>
        ))}
      </ul>
    </div>
  );
};

export const TodoListDisplaySuspense = () => {
  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <Suspense fallback={<div>Loading todo lists...</div>}>
        <TodoListContent />
      </Suspense>
    </ErrorBoundary>
  );
};
```

and

```JSX
// TodoListDisplaySuspenseDeferred.jsx
import { ErrorBoundary } from 'react-error-boundary';
import React, { Suspense } from 'react';
import { useSuspenseQuery } from '@powersync/react';

const TodoListContent = () => {
  const [query, setQuery] = React.useState('SELECT * FROM lists');
  const deferredQueryQuery = React.useDeferredValue(query);

  const { data: todoLists } = useSuspenseQuery(deferredQueryQuery);

  return (
    <div>
      <button onClick={() => setQuery('SELECT * from lists limit 1')}>Update</button>
      <ul>
        {todoLists.map((list) => (
          <li key={list.id}>{list.name}</li>
        ))}
      </ul>
    </div>
  );
};

export const TodoListDisplaySuspense = () => {
  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <Suspense fallback={<div>Loading todo lists...</div>}>
        <TodoListContent />
      </Suspense>
    </ErrorBoundary>
  );
};
```
