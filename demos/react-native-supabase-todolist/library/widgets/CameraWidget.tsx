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
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraType } from 'expo-camera/build/legacy/Camera.types';

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
  const [facing, setFacing] = React.useState(CameraType.back);

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

  const onFlipPress = () => {
    setFacing(facing === CameraType.back ? CameraType.front : CameraType.back);
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
    <SafeAreaView style={styles.container}>
      <View style={styles.topBarContainer}>
        <TouchableOpacity onPress={props.onClose} style={styles.topBarCloseIcon}>
          <Icon name={'close'} type={'material'} color={'white'} size={32} />
        </TouchableOpacity>

        <TouchableOpacity onPress={onFlipPress} style={styles.topBarFlipIcon}>
          <Icon name={'flip-camera-ios'} type={'material'} color={'white'} size={32} />
        </TouchableOpacity>
      </View>
      <CameraView
        ref={cameraRef}
        style={{ ...styles.camera, height: height, width: '100%' }}
        facing={facing}
        onCameraReady={onReady}></CameraView>
      <View style={styles.bottomCamera}>
        <TouchableOpacity disabled={loading} style={styles.shutterButton} onPress={captureImageAsync}>
          <ActivityIndicator animating={loading} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    backgroundColor: 'transparent'
  },
  topBarContainer: {
    flex: 0,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    width: '100%',
    backgroundColor: 'black',
    height: 80
  },
  topBarCloseIcon: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start'
  },
  topBarFlipIcon: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  camera: {
    flex: 1
  },
  bottomCamera: {
    flex: 0,
    // alignSelf: 'stretch',
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexDirection: 'row',
    columnGap: 30,
    backgroundColor: 'black',
    minHeight: 100
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
