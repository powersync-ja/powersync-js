import { CameraCapturedPicture } from 'expo-camera';
import React from 'react';
import { ActivityIndicator, View, Modal, StyleSheet } from 'react-native';
import { ListItem, Button, Icon, Image } from 'react-native-elements';
import { CameraWidget } from './CameraWidget';
import { TodoRecord } from '../powersync/AppSchema';
import { AttachmentRecord } from '@powersync/attachments';
import { AppConfig } from '../supabase/AppConfig';
import { useSystem } from '../powersync/system';
import { alert } from '../utils/alert';

export interface TodoItemWidgetProps {
  record: TodoRecord;
  photoAttachment: AttachmentRecord | null;
  onSavePhoto: (data: CameraCapturedPicture) => Promise<void>;
  onToggleCompletion: (completed: boolean) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export const TodoItemWidget: React.FC<TodoItemWidgetProps> = (props) => {
  const { record, photoAttachment, onDelete, onToggleCompletion, onSavePhoto } = props;
  const [loading, setLoading] = React.useState(false);
  const [isCameraVisible, setCameraVisible] = React.useState(false);
  const system = useSystem();

  const handleCancel = React.useCallback(() => {
    setCameraVisible(false);
  }, []);

  return (
    <View key={`todo-item-${record.id}`} style={{ padding: 10 }}>
      <Modal animationType="slide" transparent={false} visible={isCameraVisible} onRequestClose={handleCancel}>
        <CameraWidget onCaptured={onSavePhoto} onClose={handleCancel} />
      </Modal>
      <ListItem.Swipeable
        bottomDivider
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
              alert('Confirm', 'This item will be permanently deleted', {
                confirmation: true,
                onConfirm: () => onDelete?.()
              });
            }}
          />
        }>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <ListItem.CheckBox
            iconType="material-community"
            checkedIcon="checkbox-marked"
            uncheckedIcon="checkbox-blank-outline"
            checked={record.completed}
            onPress={async () => {
              setLoading(true);
              await onToggleCompletion(!record.completed);
              setLoading(false);
            }}
          />
        )}
        <ListItem.Content style={{ minHeight: 80 }}>
          <ListItem.Title>{record.description}</ListItem.Title>
        </ListItem.Content>
        {AppConfig.supabaseBucket &&
          (record.photo_id == null ? (
            <Icon name={'camera'} type="font-awesome" onPress={() => setCameraVisible(true)} />
          ) : photoAttachment?.local_uri != null ? (
            <Image
              source={{ uri: system.attachmentQueue.getLocalUri(photoAttachment.local_uri) }}
              containerStyle={styles.item}
              PlaceholderContent={<ActivityIndicator />}
            />
          ) : (
            <ActivityIndicator />
          ))}
      </ListItem.Swipeable>
    </View>
  );
};

const styles = StyleSheet.create({
  item: {
    aspectRatio: 1,
    width: '100%',
    flex: 1
  }
});
