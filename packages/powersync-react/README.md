# React components for PowerSync

## Context

Configure a PowerSync DB connection and add it to a context provider.

```JSX
// App.jsx
import { PowerSyncDatabase } from '@journeyapps/powersync-react-native';
import { PowerSyncContext } from "@journeyapps/powersync-react";
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
import { usePowerSync } from "@journeyapps/powersync-react";

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

### Watched Queries

Watched queries will automatically update when a dependant table is updated.

```JSX
// TodoListDisplay.jsx
import { usePowerSyncWatchedQuery } from "@journeyapps/powersync-react";

export const TodoListDisplay = () => {
    const todoLists = usePowerSyncWatchedQuery('SELECT * from lists');

    return <View>
      {todoLists.map((l) => (
        <Text key={l.id}>{JSON.stringify(l)}</Text>
      ))}
    </View>
}
```
