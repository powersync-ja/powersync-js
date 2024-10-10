import { CameraView, useCameraPermissions, CameraCapturedPicture } from 'expo-camera';
import React, { useRef } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Button, Icon } from '@rneui/themed';

export interface Props {
  onCaptured: (photo: CameraCapturedPicture) => void;
  onClose: () => void;
}

const isAndroid = Platform.OS === 'android';

export const CameraWidget: React.FC<Props> = (props) => {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  // Getting width and height of the screen
  const { width } = useWindowDimensions();
  const height = Math.round((width * 16) / 9);

  const captureImageAsync = async () => {
    if (loading) {
      return;
    }
    if (cameraRef.current && ready) {
      setLoading(true);
      const options = {
        base64: true,
        quality: 0.5,
        skipProcessing: isAndroid
      };
      const photo = await cameraRef.current.takePictureAsync(options);
      setLoading(false);
      if (photo) props.onCaptured(photo);
      props.onClose();
    }
  };

  const onReady = () => {
    if (!permission) {
      requestPermission();
    } else {
      setReady(true);
    }
  };

  if (!permission) {
    // Camera permissions are still loading
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={{ ...styles.camera, height: height, width: '100%' }}
        facing="back"
        onCameraReady={onReady}>
        <View style={styles.bottomCamera}>
          <TouchableOpacity disabled={loading} style={styles.shutterButton} onPress={captureImageAsync}>
            <ActivityIndicator animating={loading} />
          </TouchableOpacity>
        </View>
      </CameraView>
      <View style={styles.backButtonContainer}>
        <TouchableOpacity onPress={props.onClose} style={styles.backButton}>
          <Icon name={'close'} type={'material'} color={'white'} size={32} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center'
  },
  backButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    backgroundColor: 'rgba(52, 52, 52, 0.5)'
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginLeft: 10,
    marginTop: 10
  },
  camera: {
    flex: 1
  },
  bottomCamera: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexDirection: 'row',
    columnGap: 30,
    backgroundColor: 'transparent'
  },
  shutterButton: {
    width: 70,
    height: 70,
    bottom: 15,
    borderRadius: 50,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white'
  }
});
