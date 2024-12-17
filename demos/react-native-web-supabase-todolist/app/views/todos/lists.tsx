import * as React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, View } from 'react-native';
import { FAB, Text } from 'react-native-elements';

import { router, Stack } from 'expo-router';
import { LIST_TABLE, TODO_TABLE, ListRecord } from '../../../library/powersync/AppSchema';
import { useSystem } from '../../../library/powersync/system';
import { useQuery, useStatus } from '@powersync/react';
import { ListItemWidget } from '../../../library/widgets/ListItemWidget';
import { prompt } from '../../../library/utils/prompt';

const description = (total: number, completed: number = 0) => {
  return `${total - completed} pending, ${completed} completed`;
};

const ListsViewWidget: React.FC = () => {
  const system = useSystem();
  const status = useStatus();
  const { data: listRecords } = useQuery<ListRecord & { total_tasks: number; completed_tasks: number }>(`
      SELECT
        ${LIST_TABLE}.*, COUNT(${TODO_TABLE}.id) AS total_tasks, SUM(CASE WHEN ${TODO_TABLE}.completed = true THEN 1 ELSE 0 END) as completed_tasks
      FROM
        ${LIST_TABLE}
      LEFT JOIN ${TODO_TABLE}
        ON  ${LIST_TABLE}.id = ${TODO_TABLE}.list_id
      GROUP BY
        ${LIST_TABLE}.id;
      `);

  const createNewList = async (name: string) => {
    const userID = await system.supabaseConnector.userId();

    const res = await system.powersync.execute(
      `INSERT INTO ${LIST_TABLE} (id, created_at, name, owner_id) VALUES (uuid(), datetime(), ?, ?) RETURNING *`,
      [name, userID]
    );

    const resultRecord = res.rows?.item(0);
    if (!resultRecord) {
      throw new Error('Could not create list');
    }
  };

  const deleteList = async (id: string) => {
    await system.powersync.writeTransaction(async (tx) => {
      // Delete associated todos
      await tx.execute(`DELETE FROM ${TODO_TABLE} WHERE list_id = ?`, [id]);
      // Delete list record
      await tx.execute(`DELETE FROM ${LIST_TABLE} WHERE id = ?`, [id]);
    });
  };

  return (
    <View style={{ flex: 1, flexGrow: 1 }}>
      <Stack.Screen
        options={{
          headerShown: false
        }}
      />
      <FAB
        style={{ zIndex: 99, bottom: 0 }}
        icon={{ name: 'add', color: 'white' }}
        size="small"
        placement="right"
        onPress={async () => {
          prompt(
            'Add a new list',
            '',
            async (name) => {
              if (!name) {
                return;
              }
              await createNewList(name);
            },
            { placeholder: 'List name' }
          );
        }}
      />
      <ScrollView key={'lists'} style={{ maxHeight: '90%' }}>
        {!status.hasSynced ? (
          <Text>Busy with sync...</Text>
        ) : (
          listRecords.map((r) => (
            <ListItemWidget
              key={r.id}
              title={r.name}
              description={description(r.total_tasks, r.completed_tasks)}
              onDelete={() => deleteList(r.id)}
              onPress={() => {
                router.push({
                  pathname: 'views/todos/edit/[id]',
                  params: { id: r.id }
                });
              }}
            />
          ))
        )}
      </ScrollView>

      <StatusBar style={'light'} />
    </View>
  );
};

export default ListsViewWidget;
