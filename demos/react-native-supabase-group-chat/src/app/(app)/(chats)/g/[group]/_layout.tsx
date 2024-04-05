import { Stack } from 'expo-router';

export default function ChatsGroupLayout() {
  return (
    <>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            headerShown: false
          }}
        />
        <Stack.Screen name="settings" options={{ title: 'Group settings', headerShown: false }} />
      </Stack>
    </>
  );
}
