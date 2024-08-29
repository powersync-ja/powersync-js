# React components for PowerSync

## Context

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

### Accessing PowerSync Status

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

### Queries

Queries will automatically update when a dependant table is updated unless you set the `runQueryOnce` flag. You are also able to use a compilable query (e.g. [Kysely queries](https://github.com/powersync-ja/powersync-js/tree/main/packages/kysely-driver)) as a query argument in place of a SQL statement string.

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

#### Query Loading

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
