import * as React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, View } from 'react-native';
import { FAB } from 'react-native-elements';
import { observer } from 'mobx-react-lite';
import prompt from 'react-native-prompt-android';

import { useSystem } from '../../../library/stores/system';
import { ListItemWidget } from '../../../library/widgets/ListItemWidget';
import { Stack } from 'expo-router';

const App = observer(() => {
  const { listStore } = useSystem();
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
            (text) => {
              if (!text) {
                return;
              }

              listStore.createModel({
                name: text
              });
            },
            { placeholder: 'List name', style: 'shimo' }
          );
        }}
      />
      <ScrollView style={{ maxHeight: '90%' }}>
        {listStore.collection.map((t) => (
          <ListItemWidget key={t.id} model={t} />
        ))}
      </ScrollView>

      <StatusBar style={'light'} />
    </View>
  );
});

export default App;
