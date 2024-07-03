import React from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { ListItem, Icon } from 'react-native-elements';
import { usePowerSync } from '@powersync/react';
import { TODO_TABLE, TodoRecord } from '../powersync/AppSchema';

export const TodoItemWidget: React.FC<{
  record: TodoRecord;
}> = (props) => {
  const { record } = props;
  const [loading, setLoading] = React.useState(false);
  const powerSync = usePowerSync();
  return (
    <View style={{ padding: 10 }}>
      <ListItem bottomDivider>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <ListItem.CheckBox
            iconType="material-community"
            checkedIcon="checkbox-marked"
            uncheckedIcon="checkbox-blank-outline"
            checked={!!record.completed}
            onPress={async () => {
              setLoading(true);
              try {
                await powerSync.execute(`UPDATE ${TODO_TABLE} SET completed =? WHERE id = ?`, [
                  !record.completed,
                  record.id
                ]);
              } catch (ex) {
                console.error(ex);
              } finally {
                setLoading(false);
              }
            }}
          />
        )}
        <ListItem.Content style={{ minHeight: 80 }}>
          <ListItem.Title>{record.description}</ListItem.Title>
        </ListItem.Content>
        <Icon
          name="delete"
          onPress={() => {
            Alert.alert(
              'Confirm',
              'This item will be permanently deleted',
              [
                { text: 'Cancel' },
                {
                  text: 'Delete',
                  onPress: () => powerSync.execute(`DELETE FROM ${TODO_TABLE} WHERE id = ?`, [record.id])
                }
              ],
              { cancelable: true }
            );
          }}
          type="material-community"
          color="red"
        />
      </ListItem>
    </View>
  );
};
