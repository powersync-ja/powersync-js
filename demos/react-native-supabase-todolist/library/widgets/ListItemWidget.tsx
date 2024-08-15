import React from 'react';
import { View } from 'react-native';
import { ListItem, Icon, Button } from 'react-native-elements';
import { alert } from '../utils/alert';

export interface ListItemWidgetProps {
  title: string;
  description?: string;
  onPress?: () => void;
  onDelete?: () => void;
}

export const ListItemWidget: React.FC<ListItemWidgetProps> = (props) => {
  const { title, description, onDelete, onPress } = props;

  return (
    <View style={{ padding: 10 }}>
      <ListItem.Swipeable
        bottomDivider
        onPress={() => onPress?.()}
        rightContent={
          <Button
            containerStyle={{
              flex: 1,
              justifyContent: 'center',
              backgroundColor: '#d3d3d3'
            }}
            type="clear"
            icon={{ name: 'delete', color: 'red' }}
            onPress={() => {
              alert('Confirm', 'This list will be permanently deleted', {
                confirmation: true,
                onConfirm: () => onDelete?.()
              });
            }}
          />
        }>
        <Icon name="format-list-checks" type="material-community" color="grey" />
        <ListItem.Content style={{ minHeight: 80 }}>
          <ListItem.Title>{title}</ListItem.Title>
          <ListItem.Subtitle style={{ color: 'grey' }}>{description}</ListItem.Subtitle>
        </ListItem.Content>

        <ListItem.Chevron />
      </ListItem.Swipeable>
    </View>
  );
};
