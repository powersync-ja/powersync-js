import { Stack } from 'expo-router';
import React, { useMemo } from 'react';
import { useSystem } from '../library/powersync/system';
import { PowerSyncContext } from '@powersync/react';

const HomeLayout = () => {
  const system = useSystem();
  const db = useMemo(() => {
    return system.powersync;
  }, []);
  return (
    <PowerSyncContext.Provider value={db}>
      <Stack screenOptions={{ headerTintColor: '#fff', headerStyle: { backgroundColor: '#2196f3' } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </PowerSyncContext.Provider>
  );
};

export default HomeLayout;
