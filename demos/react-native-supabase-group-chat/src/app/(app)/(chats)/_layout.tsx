import { usePowerSync } from '@powersync/react-native';
import { UserCog } from '@tamagui/lucide-icons';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Loading } from '@/components/loading/Loading';

export default function ChatsLayout() {
  const { group: groupId } = useLocalSearchParams<{ group: string }>();
  const powerSync = usePowerSync();
  const [isInitialSyncCompleted, setIsInitialSyncCompleted] = useState(false);

  async function checkForInitialSync() {
    const initialSync = await powerSync.execute('SELECT name FROM ps_buckets WHERE last_applied_op > 0 LIMIT 1');
    if (initialSync.rows?._array?.length) {
      setIsInitialSyncCompleted(true);
    } else {
      setIsInitialSyncCompleted(false);

      setTimeout(() => checkForInitialSync(), 100);
    }
  }

  useEffect(() => {
    checkForInitialSync();
  }, []);

  if (!isInitialSyncCompleted) {
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
