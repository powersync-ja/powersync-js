import { StatusBar } from 'expo-status-bar';
import { ScrollView, View } from 'react-native';
import { FAB } from 'react-native-elements';
import prompt from 'react-native-prompt-android';

import { useSystem } from '../../../library/stores/system';
import { ListItemWidget } from '../../../library/widgets/ListItemWidget';
import { Stack } from 'expo-router';
import { useQuery } from '@powersync/react';
import { LIST_TABLE } from '../../../library/powersync/AppSchema';

const App = () => {
  const system = useSystem();
  const { data: lists } = useQuery(`SELECT * FROM ${LIST_TABLE}`);

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
        onPress={() => {
          prompt(
            'Add a new list',
            '',
            async (text) => {
              if (!text) {
                return;
              }

              const userID = await system.djangoConnector.userId();

              await system.powersync.execute(
                `INSERT INTO ${LIST_TABLE} (id, created_at, name, owner_id) VALUES (uuid(), datetime(), ?, ?)`,
                [text, userID]
              );
            },
            { placeholder: 'List name', style: 'shimo' }
          );
        }}
      />
      <ScrollView style={{ maxHeight: '90%' }}>
        {lists.map((t) => (
          <ListItemWidget key={t.id} record={t} />
        ))}
      </ScrollView>

      <StatusBar style={'light'} />
    </View>
  );
};

export default App;
