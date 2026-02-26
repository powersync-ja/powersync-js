import { usePowerSync, useQuery } from '@powersync/react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Input, YStack } from 'tamagui';

import { Message } from '@/components/messages/Message';
import { uuid } from '@/library/uuid';
import { useAuth } from '@/providers/AuthProvider';

export default function ChatsChatIndex() {
  const { group: groupId } = useLocalSearchParams<{ group: string }>();
  const { user } = useAuth();
  const powerSync = usePowerSync();
  const { data: groups } = useQuery('SELECT id, name FROM groups WHERE id = ?', [groupId]);
  const group = groups.length ? groups[0] : undefined;

  const { data: messages } = useQuery(
    'SELECT sender_id, content, created_at FROM messages WHERE group_id = ? ORDER BY created_at ASC',
    [group?.id],
    { streams: [{ name: 'group_messages', parameters: { group_id: groupId } }] }
  );

  const listRef = useRef<FlashListRef<any>>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

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
        options={{
          title: group.name
        }}
      />
      <YStack fullscreen>
        <YStack flexGrow={1}>
          <FlashList ref={listRef} data={messages} renderItem={({ item }) => <Message message={item} />} />
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
