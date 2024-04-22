import * as React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, View, Text } from 'react-native';
import { FAB } from 'react-native-elements';
import { observer } from 'mobx-react-lite';
import { Stack, useLocalSearchParams } from 'expo-router';
import prompt from 'react-native-prompt-android';

import { useSystem } from '../../../../library/stores/system';
import { TodoItemWidget } from '../../../../library/widgets/TodoItemWidget';

const TodoView = observer(() => {
  const { listStore, todoStore } = useSystem();
  const params = useLocalSearchParams<{ id: string }>();

  const id = params.id;
  const listModel = React.useMemo(() => {
    if (!id) {
      return null;
    }
    const listModel = listStore.getById(id);

    return listModel;
  }, [id]);

  if (!listModel) {
    return (
      <View>
        <Text>No matching List found</Text>
      </View>
    );
  }

  return (
    <View style={{ flexGrow: 1 }}>
      <Stack.Screen
        options={{
          title: listModel.record.name
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
            (text) => {
              if (!text) {
                return;
              }

              todoStore.createModel({
                list_id: listModel.id,
                description: text,
                completed: false
              });
            },
            { placeholder: 'Todo description', style: 'shimo' }
          );
        }}
      />
      <ScrollView style={{ maxHeight: '90%' }}>
        {listModel.todos.map((t) => {
          return <TodoItemWidget key={t.id} model={t} />;
        })}
      </ScrollView>

      <StatusBar style={'light'} />
    </View>
  );
});

export default TodoView;
