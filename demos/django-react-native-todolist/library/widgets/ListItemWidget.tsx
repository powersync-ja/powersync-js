import React from 'react';
import { Alert, View } from 'react-native';
import { ListItem, Icon } from 'react-native-elements';
import { router } from 'expo-router';
import { usePowerSync } from '@powersync/react';
import { LIST_TABLE, ListRecord } from '../powersync/AppSchema';

export const ListItemWidget: React.FC<{
  record: ListRecord;
}> = (props) => {
  const { record } = props;
  const powerSync = usePowerSync();
  return (
    <View style={{ padding: 10 }}>
      <ListItem bottomDivider>
        <Icon name="format-list-checks" type="material-community" color="grey" />
        <ListItem.Content style={{ minHeight: 80 }}>
          <ListItem.Title>{record.name}</ListItem.Title>
        </ListItem.Content>
        <Icon
          name="delete"
          onPress={() => {
            Alert.alert(
              'Confirm',
              'This list will be permanently deleted',
              [
                { text: 'Cancel' },
                {
                  text: 'Delete',
                  onPress: async () => powerSync.execute(`DELETE FROM ${LIST_TABLE} WHERE id = ?`, [record.id])
                }
              ],
              { cancelable: true }
            );
          }}
          type="material-community"
          color="red"
        />
        <ListItem.Chevron
          onPress={() => {
            router.push({
              pathname: 'views/todos/edit/[id]',
              params: { id: record.id }
            });
          }}></ListItem.Chevron>
      </ListItem>
    </View>
  );
};
