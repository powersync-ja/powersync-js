import React from 'react';
import { Alert, Text } from 'react-native';
import { Icon } from 'react-native-elements';
import { useNavigation } from 'expo-router';
import { Header } from 'react-native-elements';
import { useStatus } from '@powersync/react';
import { DrawerActions } from '@react-navigation/native';
import { useSystem } from '../powersync/system';

export const HeaderWidget: React.FC<{
  title?: string;
}> = (props) => {
  const system = useSystem();
  const { powersync } = system;
  const navigation = useNavigation();
  const status = useStatus();

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
          name={status.connected ? 'wifi' : 'wifi-off'}
          type="material-community"
          color="white"
          size={20}
          style={{ padding: 5 }}
          onPress={() => {
            if (system.attachmentQueue) {
              system.attachmentQueue.trigger();
            }
            Alert.alert(
              'Status',
              `${status.connected ? 'Connected' : 'Disconnected'}. \nLast Synced at ${
                status?.lastSyncedAt?.toISOString() ?? '-'
              }\nVersion: ${powersync.sdkVersion}`
            );
          }}
        />
      }
      centerContainerStyle={{ justifyContent: 'center', alignItems: 'center' }}
      centerComponent={{ text: title, style: { color: '#fff' } }}
    />
  );
};
