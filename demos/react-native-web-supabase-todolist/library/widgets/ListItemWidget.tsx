import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ListItem, Icon, Button } from '@rneui/themed';
import { alert } from '../utils/alert';

const SPACING = 12;
const MIN_ROW_HEIGHT = 72;

export interface ListItemWidgetProps {
  title: string;
  description?: string;
  onPress?: () => void;
  onDelete?: () => void;
}

export const ListItemWidget: React.FC<ListItemWidgetProps> = (props) => {
  const { title, description, onDelete, onPress } = props;

  return (
    <View style={styles.container}>
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
        <View style={styles.row}>
          <Icon name="format-list-checks" type="material-community" color="grey" style={styles.leadingIcon} />
          <ListItem.Content style={styles.content}>
            <ListItem.Title>{title}</ListItem.Title>
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
