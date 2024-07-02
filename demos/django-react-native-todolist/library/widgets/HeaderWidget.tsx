import React from 'react';
import { Alert, Text } from 'react-native';
import { Icon } from 'react-native-elements';
import { useNavigation } from 'expo-router';
import { useSystem } from '../stores/system';
import { useStatus } from '@powersync/react';
import { Header } from 'react-native-elements';
import { DrawerActions } from '@react-navigation/native';

export const HeaderWidget: React.FC<{
  title?: string;
}> = (props) => {
  const { title } = props;
  const { powersync } = useSystem();
  const status = useStatus();
  const navigation = useNavigation();

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
          color="black"
          size={20}
          style={{ padding: 5 }}
          onPress={() => {
            Alert.alert(
              'Status',
              `${status.connected ? 'Connected' : 'Disconnected'}. \nLast Synced at ${
                status.lastSyncedAt?.toISOString() ?? '-'
              }\nVersion: ${powersync.sdkVersion}`
            );
          }}
        />
      }
      centerComponent={<Text style={{ padding: 5, color: '#fff' }}>{title}</Text>}
    />
  );
};
