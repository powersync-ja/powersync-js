import 'expo-dev-client';
import { TamaguiProvider, Theme } from '@tamagui/core';
import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, LogBox, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/providers/AuthProvider';
import { NavigationThemeProvider } from '@/providers/NavigationThemeProvider';
import tamaguiConfig from '@/tamagui.config';

LogBox.ignoreAllLogs();

export default function Layout() {
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);
  const colorScheme = useColorScheme();
  const [activeColorScheme, setActiveColorScheme] = useState(colorScheme);

  useEffect(() => {
    if (appStateVisible === 'active') {
      setActiveColorScheme(colorScheme);
    }
  }, [appStateVisible, colorScheme]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      appState.current = nextAppState;
      setAppStateVisible(appState.current);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const [loaded] = useFonts({
    Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
    InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf')
  });

  if (!loaded) {
    return null;
  }

  return (
    <TamaguiProvider config={tamaguiConfig}>
      <Theme name={activeColorScheme}>
        <NavigationThemeProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
              <AuthProvider>
                <Slot />
              </AuthProvider>
            </SafeAreaProvider>
          </GestureHandlerRootView>
        </NavigationThemeProvider>
      </Theme>
    </TamaguiProvider>
  );
}
