import { Contact, MessageSquare, Settings } from '@tamagui/lucide-icons';
import { Redirect, Tabs } from 'expo-router';

import { useAuth } from '@/providers/AuthProvider';
import { PowerSyncProvider } from '@/providers/PowerSync';

export default function AppLayout() {
  const { session } = useAuth();

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <PowerSyncProvider>
      <Tabs>
        <Tabs.Screen
          name="(chats)"
          options={{
            title: 'Chats',
            headerShown: false,
            tabBarIcon: ({ color }) => <MessageSquare color={color} />
          }}
        />
        <Tabs.Screen
          name="contacts"
          options={{
            title: 'Contacts',
            headerShown: false,
            tabBarIcon: ({ color }) => <Contact color={color} />
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            headerShown: false,
            tabBarIcon: ({ color }) => <Settings color={color} />
          }}
        />
      </Tabs>
    </PowerSyncProvider>
  );
}
