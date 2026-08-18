import * as React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, RefreshControl, ScrollView, View } from 'react-native';
import { FAB } from '@rneui/themed';
import { MaterialIcons } from '@expo/vector-icons';
import { prompt } from '../../../library/utils/prompt';
import { useAbortSignal } from '../../../library/utils/useAbortSignal';

import { router, Stack } from 'expo-router';
import { LIST_TABLE, TODO_TABLE, ListRecord } from '../../../library/powersync/AppSchema';
import { useSystem } from '../../../library/powersync/system';
import { useQuery, useStatus } from '@powersync/react-native';
import { ListItemWidget } from '../../../library/widgets/ListItemWidget';
import { GuardBySync } from '../../../library/widgets/GuardBySync';
import { AppConfig } from '../../../library/supabase/AppConfig';

const description = (total: number, completed: number = 0) => {
  return `${total - completed} pending, ${completed} completed`;
};

const ListsViewWidget: React.FC = () => {
  const system = useSystem();
  const status = useStatus();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const abortSignal = useAbortSignal();
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

  const explicitSync = async () => {
    try {
      setIsRefreshing(true);
      const checkpoint = await system.powersync.requestCheckpoint();
      await checkpoint.waitForSync({ signal: abortSignal });
    } catch (e) {
      console.log('Error in explicit sync request', e);
      Alert.alert('Error', 'Failed to reach checkpoint.');
    } finally {
      setIsRefreshing(false);
    }
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
        icon={<MaterialIcons name="add" color="white" size={20} />}
        color="#aa00ff"
        size="small"
        placement="right"
        onPress={() => {
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
      <GuardBySync>
        <ScrollView
          key={'lists'}
          style={{ maxHeight: '90%' }}
          refreshControl={
            AppConfig.usePowerSyncCheckpointRequests && status?.connected ? (
              <RefreshControl refreshing={isRefreshing} onRefresh={explicitSync} />
            ) : undefined
          }>
          {listRecords.map((r) => (
            <ListItemWidget
              key={r.id}
              title={r.name!}
              description={description(r.total_tasks, r.completed_tasks)}
              onDelete={() => deleteList(r.id)}
              onPress={() => {
                router.push({
                  pathname: 'views/todos/edit/[id]',
                  params: { id: r.id }
                });
              }}
            />
          ))}
        </ScrollView>
      </GuardBySync>

      <StatusBar style={'light'} />
    </View>
  );
};

export default ListsViewWidget;
