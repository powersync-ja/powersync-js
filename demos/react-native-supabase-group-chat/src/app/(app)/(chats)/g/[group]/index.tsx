import { usePowerSync, useQuery } from '@powersync/react-native';
import { FlashList } from '@shopify/flash-list';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Input, YStack } from 'tamagui';

import { Message } from '@/components/messages/Message';
import { uuid } from '@/lib/uuid';
import { useAuth } from '@/providers/AuthProvider';

export default function ChatsChatIndex() {
  const { group: groupId } = useLocalSearchParams<{ group: string }>();
  const { user } = useAuth();
  const powerSync = usePowerSync();
  const { data: groups } = useQuery('SELECT id, name FROM groups WHERE id = ?', [groupId]);
  const group = groups.length ? groups[0] : undefined;

  const { data: messages } = useQuery(
    'SELECT sender_id, content, created_at FROM messages WHERE group_id = ? ORDER BY created_at ASC',
    [group?.id]
  );

  const [message, setMessage] = useState('');

  async function handleInputSubmit() {
    const messageId = uuid();
    const senderId = user?.id;

    await powerSync.execute(
      'INSERT INTO messages (id, created_at, sender_id, group_id, content, sent_at) VALUES (?, datetime(), ?, ?, ?, datetime())',
      [messageId, senderId, group.id, message]
    );

    setMessage('');
  }

  return group ? (
    <>
      <Stack.Screen
        name="../../../"
        options={{
          title: group.name
        }}
      />
      <YStack fullscreen>
        <YStack flexGrow={1}>
          <FlashList data={messages} renderItem={({ item }) => <Message message={item} />} estimatedItemSize={87} />
        </YStack>
        <YStack padding="$3" gap="$3">
          <Input
            backgroundColor="white"
            placeholder="Message"
            onChangeText={(text) => setMessage(text)}
            value={message}
            onSubmitEditing={handleInputSubmit}
          />
        </YStack>
      </YStack>
    </>
  ) : null;
}
