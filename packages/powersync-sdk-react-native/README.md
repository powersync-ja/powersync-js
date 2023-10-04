# PowerSync SDK for React Native

[PowerSync](https://powersync.co) is a cloud service and set of SDKs that keeps PostgreSQL databases in sync with on-device SQLite databases.

## Alpha Release
This React Native SDK package is currently in an alpha release. Functionality could change dramatically in future releases. Certain functions may be partially implemented or buggy.

# Installation

## Install Package

```bash
npx expo install @journeyapps/powersync-sdk-react-native
```

## Peer Dependencies: SQLite

This SDK currently requires `@journeyapps/react-native-quick-sqlite` as a peer dependency.

Install it in your app with:

```bash 
npx expo install @journeyapps/react-native-quick-sqlite
```


## Polyfills: Fetch

This SDK requires HTTP streaming in order to function. The following `fetch` polyfills are required for the React Native implementation of `fetch`: 

 - react-native-fetch-api
 - react-native-polyfill-globals
 - react-native-url-polyfill
 - text-encoding
 - web-streams-polyfill

 These are listed as peer dependencies and need to be added to the React Native project

 ```bash 
 npx expo install react-native-fetch-api react-native-polyfill-globals react-native-url-polyfill text-encoding web-streams-polyfill base-64 react-native-get-random-values
 ```

 Enable the polyfills in React Native app with

 ```JavaScript
// App.js
import 'react-native-polyfill-globals/auto';
 ```

## Polyfills & Babel Plugins: Watched Queries

 Watched queries require support for Async Iterators. Expo apps currently require polyfill and Babel plugins in order to use this functionality.

 ```bash
 npx expo install @azure/core-asynciterator-polyfill
 ```

 Make sure to import the polyfill early in your application

 ```JavaScript
// App.js
 import '@azure/core-asynciterator-polyfill';
 ```

 ```bash
 npx expo install -D @babel/plugin-transform-async-generator-functions
 ```

 Add the Babel plugin to your `babel.config.js` file

 ```JavaScript
 module.exports = function (api) {
  return {
    presets: [...],
    plugins: [
      // ... Other plugins
      '@babel/plugin-transform-async-generator-functions'
    ]
  };
};
 ```

## Native Projects

This package uses native libraries. Create native Android and iOS projects (if not created already) with

```bash
yarn exec expo run:android
```

# SDK Features

 * Direct access to the SQLite database - use SQL on the client and server.
 * Operations are asynchronous by default - does not block the UI.
 * No need for client-side database migrations - these are handled automatically.
 * Real-time streaming of changes.
 * Subscribe to queries for live updates.

 Upcoming features:
 * Support one write and many reads concurrently.

# Getting Started

## Declare the Schema

```JavaScript
// lib/Schema.js
import { Column, ColumnType, Index, IndexedColumn, Schema, Table } from '@journeyapps/powersync-sdk-react-native';

export const AppSchema = new Schema([
  new Table({
    name: 'todos',
    columns: [
      new Column({ name: 'list_id', type: ColumnType.TEXT }),
      new Column({ name: 'created_at', type: ColumnType.TEXT }),
      new Column({ name: 'completed_at', type: ColumnType.TEXT }),
      new Column({ name: 'description', type: ColumnType.TEXT }),
      new Column({ name: 'completed', type: ColumnType.INTEGER }),
      new Column({ name: 'created_by', type: ColumnType.TEXT }),
      new Column({ name: 'completed_by', type: ColumnType.TEXT })
    ],
    indexes: [new Index({ name: 'list', columns: [new IndexedColumn({ name: 'list_id' })] })]
  }),
  new Table({
    name: 'lists',
    columns: [
      new Column({ name: 'created_at', type: ColumnType.TEXT }),
      new Column({ name: 'name', type: ColumnType.TEXT }),
      new Column({ name: 'owner_id', type: ColumnType.TEXT })
    ]
  })
]);
```

## Create an Upload Connector

```JavaScript
// lib/Connector.js
import { UpdateType} from '@journeyapps/powersync-sdk-react-native';

/// Postgres Response codes that we cannot recover from by retrying.
const FATAL_RESPONSE_CODES = [
  // Class 22 — Data Exception
  // Examples include data type mismatch.
  new RegExp('^22...$'),
  // Class 23 — Integrity Constraint Violation.
  // Examples include NOT NULL, FOREIGN KEY and UNIQUE violations.
  new RegExp('^23...$'),
  // INSUFFICIENT PRIVILEGE - typically a row-level security violation
  new RegExp('^42501$')
];

export class Connector {

    constructor() {
        // Setup a connection to your server for uploads
        this.serverConnectionClient = TODO; 
    }

    async fetchCredentials() {
        // TODO logic to fetch a session
        return {
        endpoint: '[The PowerSync instance URL]',
        token: 'An authentication token',
        expiresAt: 'When the token expires',
        userID: 'User ID to associate the session with'
        };
    }

    async uploadData(database) {
        const transaction = await database.getNextCrudTransaction();

        if (!transaction) {
        return;
        }

        let lastOp = null;

        try {
        // Note: If transactional consistency is important, use database functions
        // or edge functions to process the entire transaction in a single call.
        for (let op of transaction.crud) {
            lastOp = op;
            // Have your server connection setup before uploading
            const table = this.serverConnectionClient.from(op.table);
            switch (op.op) {
            case UpdateType.PUT:
                const record = { ...op.opData, id: op.id };
                const { error } = await table.upsert(record);
                break;
            case UpdateType.PATCH:
                await table.update(op.opData).eq('id', op.id);
                break;
            case UpdateType.DELETE:
                await table.delete().eq('id', op.id);
                break;
            }
        }

        await transaction.complete();
        } catch (ex) {
        console.debug(ex);
        if (typeof ex.code == 'string' && FATAL_RESPONSE_CODES.some((regex) => regex.test(ex.code))) {
            /**
             * Instead of blocking the queue with these errors,
             * discard the (rest of the) transaction.
             *
             * Note that these errors typically indicate a bug in the application.
             * If protecting against data loss is important, save the failing records
             * elsewhere instead of discarding, and/or notify the user.
             */
            console.error(`Data upload error - discarding ${lastOp}`, ex);
            await transaction.complete();
        } else {
            // Error may be retryable - e.g. network error or temporary server error.
            // Throwing an error here causes this call to be retried after a delay.
            throw ex;
        }
        }
    }
}

```

## Create a PowerSync Connection

 Use a DB adapter to connect to a SQLite DB:

```JavaScript
// lib/setup-powersync.js
import { RNQSPowerSyncDatabaseOpenFactory } from '@journeyapps/powersync-sdk-react-native';
import { Connector } from './Connector';
import { AppSchema } from './Schema';

/**
 *  This uses React Native Quick SQLite to open a SQLite DB file
 */
const factory = new RNQSPowerSyncDatabaseOpenFactory({
  schema: AppSchema, // Which was created earlier
  dbFilename: 'test.sqlite'
  //location: 'optional location directory to DB file'
});

export const PowerSync = factory.getInstance();

export const setupPowerSync = async () => {
  const connector = new Connector(); // Which was declared above
  await PowerSync.init();
  await PowerSync.connect(connector);
};
```

# Using PowerSync

Once the PowerSync instance is configured you can start using the SQLite DB functions

### Fetching an Item

```JSX
// TodoItemWidget.jsx
import {Text} from 'react-native';

export const TodoItemWidget = ({id}) => {
    const [todoItem, setTodoItem] = React.useState([]);
    const [error, setError] = React.useState([]);

    React.useEffect(() => {
        // .get returns the first item of the result. Throws an exception if no result is found.
        PowerSync.get('SELECT * from todos WHERE id = ?', [id])
          .then(setTodoItem)
          .catch(ex => setError(ex.message))
    }, []);

    return <Text>{error || todoItem.description}</Text>
}
```

### Querying Items

```JSX
// ListsWidget.jsx
import {FlatList, Text} from 'react-native';

export const ListsWidget = () => {
    const [lists, setLists] = React.useState([]);

    React.useEffect(() => {
        PowerSync.getAll('SELECT * from lists').then(setLists)
    }, []);

    return (<FlatList
        data={lists.map(list => ({key: list.id, ...list}))}
        renderItem={({item}) => <Text>{item.name}</Text>}
    />)
}
```

### Querying with React Query
The PowerSync instance can be used with [React Query](https://tanstack.com/query/v3/docs/react/quick-start). The example below omits the necessary provider setup (see Quickstart).

```JSX
// ListsWidget.jsx
import {useQuery} from 'react-query';
import {FlatList, Text} from 'react-native';

export const ListsWidget = () => {
    const {data: lists} = useQuery({
        queryKey: 'lists',
        queryFn: async () => PowerSync.getAll('SELECT * from lists'),
    });

    return (<FlatList
        data={lists.map(list => ({key: list.id, ...list}))}
        renderItem={({item}) => <Text>{item.name}</Text>}
    />)
}
```

### Watching Queries

A watch API allows for queries to be executed whenever a change to a dependant table is made.

```JSX
// ListsWidget.jsx
import {FlatList, Text} from 'react-native';

 export const ListsWidget = () => {
  const [lists, setLists] = React.useState([]);

  React.useEffect(() => {
      const abortController = new AbortController();
      (async () => {
          for await(const update of PowerSync.watch('SELECT * from lists', [], {signal: abortController.signal})) {
              setLists(update)
          }
      })();

      return () => {
          abortController.abort();
      }
  }, []);

  return (<FlatList
        data={lists.map(list => ({key: list.id, ...list}))}
        renderItem={({item}) => <Text>{item.name}</Text>}
    />)
}
```

### Mutations

The `execute` method can be used for executing single SQLite statements. 

```JSX
// ListsWidget.jsx
import {Alert, Button, FlatList, Text, View} from 'react-native';

export const ListsWidget = () => {
  // Populate lists with one of methods listed above
  const [lists, setLists] = React.useState([]);

  return (
    <View>
      <FlatList
        data={lists.map(list => ({key: list.id, ...list}))}
        renderItem={({item}) => (<View>
          <Text>{item.name}</Text>
           <Button
              title="Delete"
              onPress={async () => {
                  try {
                    await PowerSync.execute(`DELETE FROM lists WHERE id = ?`, [item.id])
                    // Watched queries should automatically reload after mutation
                  } catch (ex) {
                    Alert('Error', ex.message)
                  }
                }}
            />
        </View>)}
      />
      <Button
        title="Create List"
        color="#841584"
        onPress={async () => {
            try {
              await PowerSync.execute('INSERT INTO lists (id, created_at, name, owner_id) VALUES (uuid(), datetime(), ?, ?) RETURNING *', [
                'A list name',
                "[The user's uuid]"
              ])
              // Watched queries should automatically reload after mutation
            } catch (ex) {
              Alert.alert('Error', ex.message)
            }
          }}
      />
    </View>
    )
}
```

### Transactions

Read and write transactions present a context where multiple changes can be made then finally committed to the DB or rolled back. This ensures that either all the changes get persisted, or no change is made to the DB (in the case of a rollback or exception).

`PowerSync.writeTransaction(callback)` automatically commits changes after the transaction callback is completed if `tx.rollback()` has not explicitly been called. If an exception is thrown in the callback then changes are automatically rolled back. 

`PowerSync.readTransaction(callback)` automatically rolls back any attempted changes made in the transaction callback.


```JSX
// ListsWidget.jsx
import {Alert, Button, FlatList, Text, View} from 'react-native';

export const ListsWidget = () => {
  // Populate lists with one of methods listed above
  const [lists, setLists] = React.useState([]);

  return (
    <View>
      <FlatList
        data={lists.map(list => ({key: list.id, ...list}))}
        renderItem={({item}) => (<View>
          <Text>{item.name}</Text>
           <Button
              title="Delete"
              onPress={async () => {
                  try {
                    await PowerSync.writeTransaction(async (tx) => {
                        // Delete the main list
                        await tx.executeAsync(`DELETE FROM lists WHERE id = ?`, [item.id]);
                        // Delete any children of the list
                        await tx.executeAsync(`DELETE FROM todos WHERE list_id = ?`, [item.id]);

                        // Transactions are automatically committed at the end of execution
                        // Transactions are automatically rolled back if an exception ocurred
                      })
                    // Watched queries should automatically reload after mutation
                  } catch (ex) {
                    Alert.alert('Error', ex.message)
                  }
                }}
            />
        </View>)}
      />
      <Button
        title="Create List"
        color="#841584"
        onPress={async () => {
            try {
              await PowerSync.execute('INSERT INTO lists (id, created_at, name, owner_id) VALUES (uuid(), datetime(), ?, ?) RETURNING *', [
                'A list name',
                "[The user's uuid]"
              ])
              // Watched queries should automatically reload after mutation
            } catch (ex) {
              Alert.alert('Error', ex.message)
            }
          }}
      />
    </View>
    )
}
```


### Using Hooks

Configure a PowerSync DB connection and add it to a context provider
```JSX
// App.jsx
import { PowerSyncContext, usePowerSync, usePowerSyncWatchedQuery } from "@journeyapps/powersync-sdk-react-native";
export const App = () => {
    const powerSync = React.useMemo(() => {
        // Setup PowerSync client as in "Create a PowerSync connection" step
    }, [])

    return <PowerSyncContext.Provider value={powerSync}>
        { Your components here}
        <TodoListDisplay />
    </PowerSyncContext.Provider>
}

export const TodoListDisplay = () => {
    const todoLists = usePowerSyncWatchedQuery('SELECT * from lists');

    return <View>
      {todoLists.map((l) => (
        <Text key={l.id}>{JSON.stringify(l)}</Text>
      ))}
    </View>
}
```


# Known Issues

## Android
The PowerSync connection relies heavily on HTTP streams. React Native does not support streams out of the box, so we use the [polyfills](#polyfills) mentioned. There is currently an open [issue](https://github.com/facebook/flipper/issues/2495) where the Flipper network plugin does not allow Stream events to fire. This plugin needs to be [disabled](https://stackoverflow.com/questions/69235694/react-native-cant-connect-to-sse-in-android/69235695#69235695) in order for HTTP streams to work.

Uncomment the following from
`android/app/src/debug/java/com/<projectname>/ReactNativeFlipper.java`
```java
      // NetworkFlipperPlugin networkFlipperPlugin = new NetworkFlipperPlugin();
      // NetworkingModule.setCustomClientBuilder(
      //     new NetworkingModule.CustomClientBuilder() {
      //       @Override
      //       public void apply(OkHttpClient.Builder builder) {
      //         builder.addNetworkInterceptor(new FlipperOkhttpInterceptor(networkFlipperPlugin));
      //       }
      //     });
      // client.addPlugin(networkFlipperPlugin);
```
