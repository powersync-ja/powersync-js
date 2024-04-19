import React from 'react';
import { ListModel } from '../models/ListModel';
import { Alert, View } from 'react-native';
import { ListItem, Icon } from 'react-native-elements';
import { router } from 'expo-router';

export const ListItemWidget: React.FC<{
  model: ListModel;
}> = (props) => {
  const { model } = props;
  return (
    <View style={{ padding: 10 }}>
      <ListItem bottomDivider>
        <Icon name="format-list-checks" type="material-community" color="grey" />
        <ListItem.Content style={{ minHeight: 80 }}>
          <ListItem.Title>{model.record.name}</ListItem.Title>
          <ListItem.Subtitle style={{ color: 'grey' }}>{model.description}</ListItem.Subtitle>
        </ListItem.Content>
        <Icon
          name="delete"
          onPress={() => {
            Alert.alert(
              'Confirm',
              'This list will be permanently deleted',
              [{ text: 'Cancel' }, { text: 'Delete', onPress: () => model.delete() }],
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
              params: { id: model.id }
            });
          }}></ListItem.Chevron>
      </ListItem>
    </View>
  );
};
