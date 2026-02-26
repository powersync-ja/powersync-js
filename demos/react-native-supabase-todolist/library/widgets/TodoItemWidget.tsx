import { CameraCapturedPicture } from 'expo-camera';
import React from 'react';
import { ActivityIndicator, Alert, View, Modal, StyleSheet } from 'react-native';
import { ListItem, Button, Image } from '@rneui/themed';
import { CameraWidget } from './CameraWidget';
import { TodoRecord } from '../powersync/AppSchema';
import { AttachmentRecord } from '@powersync/react-native';
import { AppConfig } from '../supabase/AppConfig';
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

  const handleCancel = React.useCallback(() => {
    setCameraVisible(false);
  }, []);

  return (
    <View key={`todo-item-${record.id}`} style={styles.container}>
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
        <View style={styles.row}>
          {loading ? (
            <ActivityIndicator style={styles.checkbox} />
          ) : (
            <ListItem.CheckBox
              iconType="material-community"
              checkedIcon="checkbox-marked"
              uncheckedIcon="checkbox-blank-outline"
              checked={!!record.completed}
              onPress={async () => {
                setLoading(true);
                await onToggleCompletion(!record.completed);
                setLoading(false);
              }}
              containerStyle={styles.checkbox}
            />
          )}
          <ListItem.Content style={styles.content}>
            <ListItem.Title style={{ fontSize: 18 }}>{record.description}</ListItem.Title>
          </ListItem.Content>
          {AppConfig.supabaseBucket &&
            (record.photo_id == null ? (
              <Button
                type="outline"
                buttonStyle={{ borderColor: 'transparent' }}
                containerStyle={styles.trailingButton}
                onPress={() => setCameraVisible(true)}
                icon={{
                  name: 'camera',
                  type: 'font-awesome',
                  color: 'black',
                  size: 24
                }}
              />
            ) : photoAttachment?.localUri != null ? (
              <Image
                source={{
                  uri:
                    photoAttachment.localUri.startsWith('/') && !photoAttachment.localUri.startsWith('file://')
                      ? `file://${photoAttachment.localUri}`
                      : photoAttachment.localUri
                }}
                containerStyle={styles.photoContainer}
                style={styles.photo}
                resizeMode="cover"
                PlaceholderContent={<ActivityIndicator />}
              />
            ) : (
              <ActivityIndicator />
            ))}
        </View>
      </ListItem.Swipeable>
    </View>
  );
};

const SPACING = 12;
const MIN_ROW_HEIGHT = 72;
const PHOTO_SIZE = 56;

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
  checkbox: {
    marginRight: 4,
    padding: 0
  },
  content: {
    flex: 1,
    minHeight: MIN_ROW_HEIGHT,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingRight: SPACING
  },
  trailingButton: {
    marginLeft: 4
  },
  photoContainer: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    minWidth: PHOTO_SIZE,
    minHeight: PHOTO_SIZE,
    borderRadius: 6,
    overflow: 'hidden'
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE
  }
});
