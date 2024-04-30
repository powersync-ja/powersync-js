import { faker } from '@faker-js/faker';
import { usePowerSync, useQuery } from '@powersync/react-native';
import { FlashList } from '@shopify/flash-list';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button, Input, YStack } from 'tamagui';

import { Message } from '@/components/messages/Message';
import { uuid } from '@/lib/uuid';
import { useAuth } from '@/providers/AuthProvider';

export default function ChatsChatIndex() {
  const { profile: profileId } = useLocalSearchParams<{ profile: string }>();
  const { user } = useAuth();
  const powerSync = usePowerSync();
  const { data: profiles } = useQuery('SELECT id, name, handle, demo FROM profiles WHERE id = ?', [profileId]);
  const profile = profiles.length ? profiles[0] : undefined;
  const [draftId, setDraftId] = useState<string>();
  const [listMessages, setListMessages] = useState<any[]>([]);

  const { data: messages } = useQuery(
    'SELECT sender_id, content, created_at FROM messages WHERE (((sender_id = ?1 AND recipient_id = ?2) OR (sender_id = ?2 AND recipient_id = ?1)) AND NOT (sender_id = ?1 AND sent_at IS NULL)) ORDER BY created_at ASC',
    [user?.id, profile?.id]
  );

  useEffect(() => {
    if (messages.length > 0) {
      setListMessages(messages);
    }
  }, [messages]);

  const [message, setMessage] = useState('');

  useEffect(() => {
    async function findOrCreateDraft(senderId: string, recipientId: string, content: string) {
      const draftMessages = await powerSync.execute(
        'SELECT id, content FROM messages WHERE sender_id = ? AND recipient_id = ? AND sent_at IS NULL',
        [senderId, recipientId]
      );

      if (draftMessages.rows?._array && draftMessages.rows._array.length > 0) {
        setDraftId(draftMessages.rows?._array[0].id);
        setMessage(draftMessages.rows?._array[0].content);
      } else if (message.length > 0) {
        const draftId = uuid();
        await powerSync.execute(
          'INSERT INTO messages (id, created_at, sender_id, recipient_id, content) VALUES (?, datetime(), ?, ?, ?)',
          [draftId, senderId, recipientId, content]
        );
        setDraftId(draftId);
      }
    }

    if (user?.id && profileId) {
      if (!draftId) {
        findOrCreateDraft(user.id, profileId, message);
      } else if (message.length > 0) {
        powerSync.execute('UPDATE messages SET content = ? WHERE id = ?', [message, draftId]);
      }
    }
  }, [user?.id, profileId, draftId, message]);

  async function handleInputSubmit() {
    await powerSync.execute('UPDATE messages SET content = ?, sent_at = datetime() WHERE id = ?', [message, draftId]);

    setMessage('');
    setDraftId(undefined);

    console.log(profile.demo);

    if (profile.demo === 1) {
      console.log('Preparing demo message ...');

      const messageId = uuid();
      const message = faker.hacker.phrase();

      setTimeout(async () => {
        await powerSync.execute(
          "INSERT INTO messages (id, created_at, sender_id, recipient_id, content) VALUES (?, datetime(), ?, ?, '...')",
          [messageId, profile.id, user?.id, message]
        );
      }, 500);

      setTimeout(async () => {
        await powerSync.execute('UPDATE messages SET sent_at = datetime(), content = ? WHERE id = ?', [
          message,
          messageId
        ]);
      }, 2000);
    }
  }

  async function handleDemoMessage() {
    const messageId = uuid();
    const message = faker.hacker.phrase();

    setTimeout(async () => {
      await powerSync.execute(
        "INSERT INTO messages (id, created_at, sender_id, recipient_id, content) VALUES (?, datetime(), ?, ?, '...')",
        [messageId, profile.id, user?.id, message]
      );
    }, 500);

    setTimeout(async () => {
      await powerSync.execute('UPDATE messages SET sent_at = datetime(), content = ? WHERE id = ?', [
        message,
        messageId
      ]);
    }, 2000);

    setMessage('');
  }

  return profile ? (
    <>
      <Stack.Screen name="../../../" options={{ title: profile.name }} />
      <YStack fullscreen>
        <YStack flexGrow={1}>
          <FlashList data={listMessages} renderItem={({ item }) => <Message message={item} />} estimatedItemSize={87} />
        </YStack>
        <YStack padding="$3" gap="$3">
          {profile.demo === 1 && <Button onPress={handleDemoMessage}>Receive demo message</Button>}
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
