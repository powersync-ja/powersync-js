import { useStatus } from '@powersync/react-native';
import { UserCog } from '@tamagui/lucide-icons';
import { Link, Stack, useLocalSearchParams } from 'expo-router';

import { Loading } from '@/components/loading/Loading';

export default function ChatsLayout() {
  const { group: groupId } = useLocalSearchParams<{ group: string }>();
  const status = useStatus();

  if (!status.hasSynced) {
    return <Loading message="Syncing data" />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Chats' }} />
      <Stack.Screen name="c" options={{ title: 'Contact' }} />
      <Stack.Screen
        name="g"
        options={{
          title: 'Group',
          headerRight: (props) => (
            <Link href={`/(app)/(chats)/g/${groupId}/settings`}>
              <UserCog size="$1.5" color={props.tintColor} />
            </Link>
          )
        }}
      />
    </Stack>
  );
}
