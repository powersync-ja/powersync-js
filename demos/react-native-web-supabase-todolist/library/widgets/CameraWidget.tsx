import { CameraView, useCameraPermissions, CameraCapturedPicture, CameraType } from 'expo-camera';
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

export interface Props {
  onCaptured: (photo: CameraCapturedPicture) => void;
  onClose: () => void;
}

const isAndroid = Platform.OS === 'android';

export const CameraWidget: React.FC<Props> = (props) => {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera not available on web</Text>
      </View>
    );
  }

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [facing, setFacing] = React.useState<CameraType>('back');

  const { width } = useWindowDimensions();
  const height = Math.round((width * 16) / 9);

  const captureImageAsync = async () => {
    if (loading) return;
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
    setFacing(facing === 'back' ? 'front' : 'back');
  };

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant permission" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBarContainer}>
        <TouchableOpacity onPress={props.onClose} style={styles.topBarCloseIcon}>
          <Icon name="close" type="material" color="white" size={32} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onFlipPress} style={styles.topBarFlipIcon}>
          <Icon name="flip-camera-ios" type="material" color="white" size={32} />
        </TouchableOpacity>
      </View>
      <CameraView
        ref={cameraRef}
        style={{ ...styles.camera, height, width: '100%' }}
        facing={facing}
        onCameraReady={onReady}
      />
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
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white'
  },
  topBarContainer: {
    flex: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    width: '100%',
    backgroundColor: 'black',
    height: 80
  },
  topBarCloseIcon: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start'
  },
  topBarFlipIcon: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  camera: {
    flex: 1
  },
  bottomCamera: {
    flex: 0,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    columnGap: 30,
    backgroundColor: 'black',
    minHeight: 100
  },
  shutterButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center'
  }
});
