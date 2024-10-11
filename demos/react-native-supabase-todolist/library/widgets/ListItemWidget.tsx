import React from 'react';
import { Alert, View } from 'react-native';
import { ListItem, Icon, Button } from '@rneui/themed';

export interface ListItemWidgetProps {
  title: string;
  description?: string;
  onPress?: () => void;
  onDelete?: () => void;
}

export const ListItemWidget: React.FC<ListItemWidgetProps> = ({ title, description, onPress, onDelete }) => {
  return (
    <View style={{ padding: 10 }}>
      <ListItem.Swipeable
        bottomDivider
        onPress={() => onPress?.()}
        rightContent={
          <Button
            buttonStyle={{
              flexDirection: 'column',
              alignContent: 'center',
              borderColor: 'transparent',
              minHeight: '100%'
            }}
            containerStyle={{
              flex: 1,
              flexGrow: 1,
              height: '100%',
              justifyContent: 'center',
              backgroundColor: 'rgba(240, 15, 15, 0.9)'
            }}
            title="Delete"
            titleStyle={{ color: 'white' }}
            type="clear"
            icon={{ name: 'trash', type: 'font-awesome', color: 'white' }}
            onPress={() => {
              Alert.alert(
                'Confirm',
                'This list will be permanently deleted',
                [{ text: 'Cancel' }, { text: 'Delete', onPress: () => onDelete?.() }],
                { cancelable: true }
              );
            }}
          />
        }>
        <Icon name="format-list-checks" type="material-community" color="grey" />
        <ListItem.Content style={{ minHeight: 80 }}>
          <ListItem.Title style={{ color: 'black' }}>{title}</ListItem.Title>
          <ListItem.Subtitle style={{ color: 'grey' }}>{description}</ListItem.Subtitle>
        </ListItem.Content>

        <ListItem.Chevron />
      </ListItem.Swipeable>
    </View>
  );
};
