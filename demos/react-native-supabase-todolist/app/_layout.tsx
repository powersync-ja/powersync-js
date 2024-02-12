import { Stack } from 'expo-router';
import React, { useMemo } from 'react';
import { useSystem } from '../library/powersync/system';
import { PowerSyncContext } from '@journeyapps/powersync-sdk-react-native';

/**
 * This App uses a nested navigation stack.
 *
 * First layer is a Stack where navigation from index affects a stack
 *  - Login: Auth flow
 *      - Register
 *  - Views: App views once authenticated. The only way to navigate back is to sign out
 *      * Second layer: Uses a navigation drawer, navigating to any of these views replaces the current view. The first layer stack is hidden.
 *          - TodoLists (exposes another stack in order to edit a specific list)
 *              - Third layer: Edit stack
 *                * Edit [todolist] can navigate back to TodoLists
 *          - SQL Console
 *          - Sign out. Psuedo view to initiate signout flow. Navigates back to first layer.
 */
const HomeLayout = () => {
  const system = useSystem();
  const db = useMemo(() => {
    return system.powersync;
  }, []);
  return (
    <PowerSyncContext.Provider value={db}>
      <Stack screenOptions={{ headerTintColor: '#fff', headerStyle: { backgroundColor: '#2196f3' } }}>
        <Stack.Screen name="signin" options={{ title: 'Supabase Login' }} />
        <Stack.Screen name="register" options={{ title: 'Register' }} />

        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="views" options={{ headerShown: false }} />
      </Stack>
    </PowerSyncContext.Provider>
  );
};

export default HomeLayout;
