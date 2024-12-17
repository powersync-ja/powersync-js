import React from 'react';
import { Alert, View, StyleSheet } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { Icon, Header } from '@rneui/themed';
import { useStatus } from '@powersync/react';
import { DrawerActions } from '@react-navigation/native';
import { useSystem } from '../powersync/system';
import { usePathname } from 'expo-router';

export const HeaderWidget: React.FC<{
  title?: string;
}> = (props) => {
  const system = useSystem();
  const { powersync } = system;
  const navigation = useNavigation();
  const status = useStatus();

  const { title } = props;

  const pathName = usePathname();
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
        <View style={styles.headerRight}>
          {pathName.includes('lists') && (
            <Icon
              name="search"
              type="material"
              color="white"
              size={24}
              onPress={() => {
                router.push('search_modal');
              }}
            />
          )}
          <Icon
            name={status.connected ? 'wifi' : 'wifi-off'}
            type="material-community"
            color="white"
            size={24}
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
        </View>
      }
      centerContainerStyle={{ justifyContent: 'center', alignItems: 'center' }}
      centerComponent={{ text: title, style: { color: '#fff' } }}
    />
  );
};

const styles = StyleSheet.create({
  headerRight: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center'
  }
});
