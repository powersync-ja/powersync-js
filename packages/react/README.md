# React components for PowerSync

## Context

Configure a PowerSync DB connection and add it to a context provider.

```JSX
// App.jsx
import { PowerSyncDatabase } from '@powersync/react-native';
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
      <div>status.connected ? 'wifi' : 'wifi-off'</div>
      <div>!status.hasSynced ? 'Busy syncing...' : 'Data is here'</div>
    </>
  )
};
```

### Queries

Queries will automatically update when a dependant table is updated unless you set the `runQueryOnce` flag.

```JSX
// TodoListDisplay.jsx
import { useQuery } from "@powersync/react";

export const TodoListDisplay = () => {
    const { data: todoLists } = useQuery('SELECT * from lists');

    return <View>
      {todoLists.map((l) => (
        <Text key={l.id}>{JSON.stringify(l)}</Text>
      ))}
    </View>
}
```
