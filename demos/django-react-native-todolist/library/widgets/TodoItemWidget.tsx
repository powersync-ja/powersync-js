import React from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { ListItem, Icon } from 'react-native-elements';
import { TodoModel } from '../models/TodoModel';

export const TodoItemWidget: React.FC<{
  model: TodoModel;
}> = (props) => {
  const { model } = props;
  const [loading, setLoading] = React.useState(false);

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
            checked={!!model.record.completed}
            onPress={async () => {
              setLoading(true);
              try {
                await model.toggleCompletion(!model.record.completed);
              } catch (ex) {
                console.error(ex);
              } finally {
                setLoading(false);
              }
            }}
          />
        )}
        <ListItem.Content style={{ minHeight: 80 }}>
          <ListItem.Title>{model.record.description}</ListItem.Title>
        </ListItem.Content>
        <Icon
          name="delete"
          onPress={() => {
            Alert.alert(
              'Confirm',
              'This item will be permanently deleted',
              [{ text: 'Cancel' }, { text: 'Delete', onPress: () => model.delete() }],
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
