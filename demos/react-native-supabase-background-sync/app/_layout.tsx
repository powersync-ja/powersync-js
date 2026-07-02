import { useColorScheme } from '@/hooks/useColorScheme';
import { useSystem } from '@/powersync/SystemContext';
import { PowerSyncContext } from '@powersync/react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import 'react-native-reanimated';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const system = useSystem();
  const db = useMemo(() => {
    if (!system.powersync.connected) {
      system.init();
    }
    return system.powersync;
  }, [system]);

  if (!loaded) {
    return null;
  }

  return (
    <PowerSyncContext.Provider value={db}>
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1 }}>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </SafeAreaView>
      </SafeAreaProvider>
    </PowerSyncContext.Provider>
  );
}