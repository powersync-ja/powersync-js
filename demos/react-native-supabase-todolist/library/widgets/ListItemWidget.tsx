import React from 'react';
import { Alert, View, StyleSheet } from 'react-native';
import { ListItem, Icon, Button } from '@rneui/themed';

const SPACING = 12;
const MIN_ROW_HEIGHT = 72;

export interface ListItemWidgetProps {
  title: string;
  description?: string;
  onPress?: () => void;
  onDelete?: () => void;
}

export const ListItemWidget: React.FC<ListItemWidgetProps> = ({ title, description, onPress, onDelete }) => {
  return (
    <View style={styles.container}>
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
        <View style={styles.row}>
          <Icon name="format-list-checks" type="material-community" color="grey" style={styles.leadingIcon} />
          <ListItem.Content style={styles.content}>
            <ListItem.Title style={{ color: 'black' }}>{title}</ListItem.Title>
            <ListItem.Subtitle style={{ color: 'grey' }}>{description}</ListItem.Subtitle>
          </ListItem.Content>
          <ListItem.Chevron />
        </View>
      </ListItem.Swipeable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING,
    paddingVertical: 6
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minHeight: MIN_ROW_HEIGHT,
    gap: SPACING
  },
  leadingIcon: {
    marginRight: 4
  },
  content: {
    flex: 1,
    minHeight: MIN_ROW_HEIGHT,
    justifyContent: 'center',
    paddingVertical: 8
  }
});
