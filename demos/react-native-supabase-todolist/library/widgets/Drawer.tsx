import React from 'react';
import { Drawer as ExpoDrawer } from 'expo-router/drawer';
import { HeaderWidget } from './HeaderWidget';

/**
 * As of Expo SDK 56 `expo-router` no longer depends on React Navigation and ships its own
 * `Drawer` layout. We wrap it here to render the shared {@link HeaderWidget} as the header for
 * every drawer screen, preserving the previous behaviour without a custom `createDrawerNavigator`.
 */
function DrawerWithHeader(props: React.ComponentProps<typeof ExpoDrawer>) {
  return (
    <ExpoDrawer
      screenOptions={{ header: ({ options }) => <HeaderWidget title={options.title ?? ''} /> }}
      {...props}
    />
  );
}

DrawerWithHeader.Screen = ExpoDrawer.Screen;

export const Drawer = DrawerWithHeader;

export default Drawer;
