import React from 'react';
import { ScrollView, StatusBar, View } from 'react-native';
import { usePowerSync, useQuery } from '@powersync/react';
import { Stack } from 'expo-router';
import { FAB } from 'react-native-elements';
import { TodoItemWidget } from './TodoItemWidget';
import prompt from 'react-native-prompt-android';
import { ListRecord, TODO_TABLE, TodoRecord } from '../powersync/AppSchema';

export const ListTodosWidget: React.FC<{
  record: ListRecord;
}> = (props) => {
  const { record } = props;

  const { data: todos } = useQuery<TodoRecord>(`SELECT * FROM ${TODO_TABLE} WHERE list_id = ?`, [record.id]);
  const powerSync = usePowerSync();
  return (
    <View style={{ flexGrow: 1 }}>
      <Stack.Screen
        options={{
          title: record.name!
        }}
      />
      <FAB
        style={{ zIndex: 99, bottom: 0 }}
        icon={{ name: 'add', color: 'white' }}
        size="small"
        placement="right"
        onPress={() => {
          prompt(
            'Add a new Todo',
            '',
            async (text) => {
              if (!text) {
                return;
              }

              await powerSync.execute(
                `INSERT INTO ${TODO_TABLE} (id, created_at, description, list_id, completed) VALUES (uuid(), datetime(), ?, ?, ?)`,
                [text, record.id, false]
              );
            },
            { placeholder: 'Todo description', style: 'shimo' }
          );
        }}
      />
      <ScrollView style={{ maxHeight: '90%' }}>
        {todos.map((t) => {
          return <TodoItemWidget key={t.id} record={t} />;
        })}
      </ScrollView>

      <StatusBar style={'light'} />
    </View>
  );
};
