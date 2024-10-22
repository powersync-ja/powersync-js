import { CameraCapturedPicture } from 'expo-camera';
import React from 'react';
import { ActivityIndicator, Alert, View, Modal, StyleSheet } from 'react-native';
import { ListItem, Button, Icon, Image } from '@rneui/themed';
import { CameraWidget } from './CameraWidget';
import { TodoRecord } from '../powersync/AppSchema';
import { AttachmentRecord } from '@powersync/attachments';
import { AppConfig } from '../supabase/AppConfig';
import { useSystem } from '../powersync/system';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
        <SafeAreaProvider>
          <CameraWidget onCaptured={onSavePhoto} onClose={handleCancel} />
        </SafeAreaProvider>
      </Modal>
      <ListItem.Swipeable
        bottomDivider
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
                'This item will be permanently deleted',
                [{ text: 'Cancel' }, { text: 'Delete', onPress: () => onDelete?.() }],
                { cancelable: true }
              );
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
          <ListItem.Title style={{ fontSize: 20 }}>{record.description}</ListItem.Title>
        </ListItem.Content>
        {AppConfig.supabaseBucket &&
          (record.photo_id == null ? (
            <Button
              type="outline"
              buttonStyle={{ borderColor: 'transparent' }}
              onPress={() => setCameraVisible(true)}
              icon={{
                name: 'camera',
                type: 'font-awesome',
                color: 'black',
                size: 28
              }}>
              {/* <Icon name={'camera'} type="material" color={'black'} size={32} /> */}
            </Button>
          ) : photoAttachment?.local_uri != null ? (
            <Image
              source={{ uri: system.attachmentQueue?.getLocalUri(photoAttachment.local_uri) }}
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
