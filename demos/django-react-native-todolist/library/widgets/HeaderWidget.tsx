import React from 'react';
import { Alert, Text } from 'react-native';
import { Icon } from 'react-native-elements';
import { useNavigation } from 'expo-router';
import { useSystem } from '../stores/system';
import { Header } from 'react-native-elements';
import { observer } from 'mobx-react-lite';
import { DrawerActions } from '@react-navigation/native';

export const HeaderWidget: React.FC<{
  title?: string;
}> = observer((props) => {
  const { title } = props;
  const { powersync } = useSystem();
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
          name={powersync.connected ? 'wifi' : 'wifi-off'}
          type="material-community"
          color="black"
          size={20}
          style={{ padding: 5 }}
          onPress={() => {
            Alert.alert(
              'Status',
              `${powersync.connected ? 'Connected' : 'Disconnected'}. \nLast Synced at ${
                powersync.currentStatus?.lastSyncedAt.toISOString() ?? '-'
              }\nVersion: ${powersync.sdkVersion}`
            );
          }}
        />
      }
      centerComponent={<Text style={{ padding: 5, color: '#fff' }}>{title}</Text>}
    />
  );
});
