import { CameraCapturedPicture } from 'expo-camera';
import React from 'react';
import { ActivityIndicator, View, Modal, StyleSheet, Platform } from 'react-native';
import { ListItem, Button, Image } from '@rneui/themed';
import { CameraWidget } from './CameraWidget';
import { TodoRecord } from '../powersync/AppSchema';
import { AppConfig } from '../supabase/AppConfig';
import { useSystem } from '../powersync/system';
import { alert } from '../utils/alert';
import { AttachmentRecord } from '@powersync/react-native';

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
  const [imageUri, setImageUri] = React.useState<string | null>(null);
  const system = useSystem();

  const handleCancel = React.useCallback(() => {
    setCameraVisible(false);
  }, []);

  React.useEffect(() => {
    let blobUrl: string | null = null;

    const loadImage = async () => {
      if (!photoAttachment?.localUri) {
        setImageUri(null);
        return;
      }

      // On web, convert IndexedDB URI to blob URL
      if (Platform.OS === 'web' && photoAttachment.localUri.startsWith('indexeddb://')) {
        try {
          const localStorage = system.photoAttachmentQueue?.localStorage;
          if (localStorage) {
            const arrayBuffer = await localStorage.readFile(photoAttachment.localUri);
            const blob = new Blob([arrayBuffer], { type: photoAttachment.mediaType || 'image/jpeg' });
            blobUrl = URL.createObjectURL(blob);
            setImageUri(blobUrl);
          }
        } catch (error) {
          console.error('Failed to load image from IndexedDB:', error);
          setImageUri(null);
        }
      } else {
        // On native, use the URI directly (ensure file:// prefix)
        const uri = photoAttachment.localUri;
        setImageUri(uri.startsWith('/') && !uri.startsWith('file://') ? `file://${uri}` : uri);
      }
    };

    loadImage();

    // Cleanup blob URL on unmount or when photoAttachment changes
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [photoAttachment?.localUri, system.photoAttachmentQueue]);

  return (
    <View key={`todo-item-${record.id}`} style={styles.container}>
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
        <View style={styles.row}>
          {loading ? (
            <ActivityIndicator style={styles.checkbox} />
          ) : (
            <ListItem.CheckBox
              iconType="material-community"
              checkedIcon="checkbox-marked"
              uncheckedIcon="checkbox-blank-outline"
              checked={Boolean(record.completed)}
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
            ) : imageUri != null ? (
              <Image
                source={{ uri: imageUri }}
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
