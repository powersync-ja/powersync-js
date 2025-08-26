import '@azure/core-asynciterator-polyfill';
import React, { useEffect } from 'react';
import { Button, SafeAreaView, Text, useColorScheme, View, Image, FlatList } from 'react-native';
import { useQuery, PowerSyncContext, usePowerSync } from '@powersync/react-native';
import { lists as drizzleLists, system, SystemContext, todos, useOpSqlite, useSystem } from './SystemContext';
import { Scalar } from '@op-engineering/op-sqlite';
import { toCompilableQuery } from '@powersync/drizzle-driver';
import { eq } from 'drizzle-orm';

function App(): React.JSX.Element {
  useEffect(() => {
    const initialize = async () => {
      try {
        await system.init();
        console.log('System initialized successfully');
      } catch (error) {
        console.error('Error initializing system:', error);
      }
    };
    initialize();
  }, []);

  return (
    <SystemContext.Provider value={system}>
      <PowerSyncContext.Provider value={system.powersync}>
        <SafeAreaView>
          <View
            style={{
              padding: 20
            }}>
            <Image
              source={require('./logo.png')}
              style={{
                objectFit: 'contain',
                height: 50,
                width: '100%'
              }}
            />
          </View>
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              padding: 25
            }}>
            <View>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  marginVertical: 10,
                  textAlign: 'center'
                }}>
                Async List
              </Text>
              <AsyncList />
            </View>
            <View>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  marginVertical: 10,
                  textAlign: 'center'
                }}>
                Sync List
              </Text>
              <SyncDrizzleList />
            </View>
          </View>
        </SafeAreaView>
      </PowerSyncContext.Provider>
    </SystemContext.Provider>
  );
}

function AsyncList() {
  // const powerSync = usePowerSync();
  const { drizzle } = useSystem();
  const {
    data: lists,
    isLoading,
    error
  } = useQuery(
    toCompilableQuery(drizzle.select().from(drizzleLists).leftJoin(todos, eq(drizzleLists.id, todos.list_id)))
  );

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  if (error) {
    return <Text>Error: {error.message}</Text>;
  }

  return (
    <View>
      <FlatList
        data={lists.flatMap((list) => list.lists)}
        renderItem={({ item: list, index }) => (
          <View
            key={`${list.id}${index}`}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
            <Text
              style={{
                fontSize: 16,
                marginVertical: 5,
                padding: 10,
                backgroundColor: '#f0f0f0',
                borderRadius: 5
              }}>
              {list.name}
            </Text>
            <Button
              title="X"
              onPress={async () => {
                // await powerSync.execute('DELETE FROM lists WHERE id = ?', [list.id]);
                await drizzle.delete(drizzleLists).where(eq(drizzleLists.id, list.id!));
              }}></Button>
          </View>
        )}
      />
      <Button
        title="Add List"
        onPress={async () => {
          const id = Math.floor(Math.random() * 1000).toString();
          // await powerSync.execute('INSERT INTO lists(id, name) VALUES(?, ?)', [id, `List ${id}`]);
          await drizzle.insert(drizzleLists).values({
            id,
            name: `List ${id}`
          });
        }}
      />
    </View>
  );
}

function SyncDrizzleList() {
  const system = useSystem();
  const [lists, setLists] = React.useState(
    system.drizzleSync
      .select()
      .from(drizzleLists)
      .leftJoin(todos, eq(drizzleLists.id, todos.list_id))
      .all()
  );

  // Listens for changes from PowerSync updates
  useEffect(() => {
    const disposeChange = system.powersync.onChangeWithCallback(
      {
        onChange: () => {
          setLists(
            system.drizzleSync.select().from(drizzleLists).leftJoin(todos, eq(drizzleLists.id, todos.list_id)).all()
          );
        }
      },
      {
        tables: ['lists']
      }
    );

    return () => {
      disposeChange();
    };
  }, []);

  return (
    <View>
      <FlatList
        data={lists.flatMap((list) => list.lists)}
        renderItem={({ item: list, index }) => (
          <View
            key={`${list.id}${index}`}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
            <Text
              style={{
                fontSize: 16,
                marginVertical: 5,
                padding: 10,
                backgroundColor: '#f0f0f0',
                borderRadius: 5
              }}>
              {list.name}
            </Text>
            <Button
              title="X"
              onPress={() => {
                system.drizzleSync
                  .delete(drizzleLists)
                  .where(eq(drizzleLists.id, list.id!))
                  .run();
              }}></Button>
          </View>
        )}
      />
      <Button
        title="Add List"
        onPress={() => {
          const id = Math.floor(Math.random() * 1000);
          system.drizzleSync
            .insert(drizzleLists)
            .values({
              id: id.toString(),
              name: `List ${id}`
            })
            .run();
        }}
      />
    </View>
  );
}

function SyncList() {
  const [lists, setLists] = React.useState<{ id: string; name: string }[]>([]);
  const opSqlite = useOpSqlite();
  const system = useSystem();

  const getLists = () => {
    if (!opSqlite) return;

    try {
      const result = opSqlite.executeSync('SELECT * FROM lists');
      setLists(
        result.rows.map((row) => ({
          id: row.id as string,
          name: row.name as string
        }))
      );
    } catch (error) {
      console.error('Error fetching lists:', error);
      return;
    }
  };

  // Queue up transactions from ps_crud
  const flushCrudTransactions = async () => {
    await system.connector.uploadData(system.powersync);
  };

  // Intial update of lists
  useEffect(() => {
    getLists();
  }, [opSqlite]);

  // Listens for changes from PowerSync updates
  useEffect(() => {
    const disposeChange = system.powersync.onChangeWithCallback(
      {
        onChange: () => {
          getLists();
        }
      },
      {
        tables: ['lists']
      }
    );

    return () => {
      disposeChange();
    };
  }, []);

  return (
    <View>
      <FlatList
        data={lists}
        renderItem={({ item: list }) => (
          <View
            key={list.id}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
            <Text
              style={{
                fontSize: 16,
                marginVertical: 5,
                padding: 10,
                backgroundColor: '#f0f0f0',
                borderRadius: 5
              }}>
              {list.name}
            </Text>
            <Button
              title="X"
              onPress={() => {
                const id = Math.floor(Math.random() * 1000);
                opSqlite.executeSync('INSERT INTO ps_crud (id, data, tx_id) VALUES(?, ?, ?)', [
                  id,
                  JSON.stringify({
                    op: 'DELETE',
                    type: 'lists',
                    id: list.id
                  }),
                  id
                ]);
                flushCrudTransactions();
                getLists();
              }}></Button>
          </View>
        )}
      />
      <Button
        title="Add List"
        onPress={() => {
          const id = Math.floor(Math.random() * 1000);
          opSqlite.executeSync('INSERT INTO ps_crud (id, data, tx_id) VALUES(?, ?, ?)', [
            id,
            JSON.stringify({
              op: 'PUT',
              type: 'lists',
              id,
              data: {
                name: `List ${id}`
              }
            })
          ]);
          flushCrudTransactions();
          getLists();
        }}
      />
    </View>
  );
}

export default App;
