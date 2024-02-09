import React from 'react';
import { Alert, Text } from 'react-native';
import { Icon } from 'react-native-elements';
import { useNavigation } from 'expo-router';
import { Header } from 'react-native-elements';
import { DrawerActions } from '@react-navigation/native';
import { useSystem } from '../powersync/system';

export const HeaderWidget: React.FC<{
  title?: string;
}> = (props) => {
  const system = useSystem();
  const { powersync } = system;
  const navigation = useNavigation();
  const [connected, setConnected] = React.useState(powersync.connected);

  React.useEffect(() => {
    return powersync.registerListener({
      statusChanged: (status) => {
        setConnected(status.connected);
      }
    });
  }, [powersync]);

  const { title } = props;
  return (
    <Header
      leftComponent={
        <Icon
          name={'menu'}
          type="material-community"
          color="white"
          style={{ padding: 5 }}
          onPress={() => {
            navigation.dispatch(DrawerActions.toggleDrawer());
          }}
        />
      }
      rightComponent={
        <Icon
          name={connected ? 'wifi' : 'wifi-off'}
          type="material-community"
          color="black"
          size={20}
          style={{ padding: 5 }}
          onPress={() => {
            system.attachmentQueue.trigger();
            Alert.alert(
              'Status',
              `${connected ? 'Connected' : 'Disconnected'}. \nLast Synced at ${
                powersync.currentStatus?.lastSyncedAt.toISOString() ?? '-'
              }\nVersion: ${powersync.sdkVersion}`
            );
          }}
        />
      }
      centerComponent={<Text style={{ padding: 5, color: '#fff' }}>{title}</Text>}
    />
  );
};
