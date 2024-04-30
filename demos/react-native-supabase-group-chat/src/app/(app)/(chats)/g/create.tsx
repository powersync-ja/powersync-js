import { usePowerSync } from '@powersync/react-native';
import { Plus } from '@tamagui/lucide-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, Input, XStack, YStack } from 'tamagui';

import { MemberSelector } from '@/components/groups/MemberSelector';
import { uuid } from '@/lib/uuid';
import { useAuth } from '@/providers/AuthProvider';

export default function CreateGroup() {
  const { name: initialName } = useLocalSearchParams<{ name: string }>();
  const [name, setName] = useState<string>(initialName ?? '');
  const powerSync = usePowerSync();
  const { user } = useAuth();
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const router = useRouter();

  async function handleCreateGroup() {
    const groupId = uuid();

    /* await powerSync.execute(
      "INSERT INTO groups (id, owner_id, name) VALUES (?, ?, ?)",
      [groupId, user?.id, name]
    ); */

    await powerSync.writeTransaction(async (tx) => {
      try {
        await tx.executeAsync('INSERT INTO groups (id, owner_id, name, created_at) VALUES (?, ?, ?, datetime())', [
          groupId,
          user?.id,
          name
        ]);
        for (const profileId of selectedContacts) {
          const membershipId = uuid();
          await tx.executeAsync(
            'INSERT INTO memberships (id, group_id, profile_id, created_at) VALUES (?, ?, ?, datetime())',
            [membershipId, groupId, profileId]
          );
        }
        router.push(`/(app)/(chats)/g/${groupId}`);
      } catch (error) {
        console.error('Error', error);
      }
    });
  }

  return (
    <>
      <Stack.Screen name="../../" options={{ title: 'Create group' }} />
      <YStack paddingTop="$3" fullscreen>
        <XStack marginHorizontal="$3" gap="$3">
          <Input
            backgroundColor="white"
            flexGrow={1}
            onChangeText={(text) => setName(text)}
            value={name}
            borderRadius="$3"
          />
          <Button icon={<Plus size="$1.5" />} backgroundColor="$brand1" color="white" onPress={handleCreateGroup} />
        </XStack>
        <MemberSelector selectedContacts={selectedContacts} setSelectedContacts={setSelectedContacts} />
      </YStack>
    </>
  );
}
