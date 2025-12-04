import { usePowerSync, useQuery } from '@powersync/react-native';
import { Save, Trash, XCircle } from '@tamagui/lucide-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Button, Input, XStack, YStack } from 'tamagui';

import { MemberSelector } from '@/components/groups/MemberSelector';
import { uuid } from '@/lib/uuid';

export default function GroupSettings() {
  const { group: groupId } = useLocalSearchParams<{ group: string }>();
  const router = useRouter();
  const [name, setName] = useState<string>('');
  const [members, setMembers] = useState<Set<string>>(new Set());
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const powerSync = usePowerSync();

  const { data: groups } = useQuery('SELECT name FROM groups WHERE id = ?', [groupId]);
  const { data: groupMembers } = useQuery('SELECT profile_id FROM memberships WHERE group_id = ?', [groupId]);

  useEffect(() => {
    if (groups.length > 0) {
      setName(groups[0].name);
    }
  }, [groups]);

  useEffect(() => {
    if (groupMembers.length > 0) {
      const memberIds = groupMembers.map((obj) => obj.profile_id);
      setMembers(new Set(memberIds));
      setSelectedContacts(new Set(memberIds));
    }
  }, [groupMembers]);

  /* useEffect(() => {
    async function loadMembers() {
      const groups = await powerSync.execute(
        "SELECT name FROM groups WHERE id = ?",
        [groupId]
      );
      setName(groups.rows?._array[0]?.name);

      const members = await powerSync.execute(
        "SELECT profile_id FROM memberships WHERE group_id = ?",
        [groupId]
      );
      const memberIds = members.rows?._array.map((obj) => obj.profile_id);
      setMembers(new Set(memberIds));
      setSelectedContacts(new Set(memberIds));
    }
    if (groupId) {
      loadMembers();
    }
  }, [groupId]); */

  async function handleSave() {
    const addedContacts = new Set<string>();
    const removedContacts = new Set<string>();

    // Find removed contacts
    for (const elem of members) {
      if (!selectedContacts.has(elem)) {
        removedContacts.add(elem);
      }
    }

    // Find added contacts
    for (const elem of selectedContacts) {
      if (!members.has(elem)) {
        addedContacts.add(elem);
      }
    }

    await powerSync.writeTransaction(async (tx) => {
      try {
        await tx.execute('UPDATE groups SET name= ? WHERE id = ?', [name, groupId]);
        for (const profileId of removedContacts) {
          await tx.execute('DELETE FROM memberships WHERE group_id = ? AND profile_id = ?', [groupId, profileId]);
        }
        for (const profileId of addedContacts) {
          const membershipId = uuid();
          await tx.execute(
            'INSERT INTO memberships (id, group_id, profile_id, created_at) VALUES (?, ?, ?, datetime())',
            [membershipId, groupId, profileId]
          );
        }
        router.back();
      } catch (error) {
        console.error('Error', error);
      }
    });
  }

  function handleDelete() {
    async function deleteTransaction() {
      await powerSync.writeTransaction(async (tx) => {
        try {
          await tx.execute('DELETE FROM memberships WHERE group_id = ?', [groupId]);
          await tx.execute('DELETE FROM messages WHERE group_id = ?', [groupId]);
          await tx.execute('DELETE FROM groups WHERE id = ?', [groupId]);

          router.back();
        } catch (error) {
          console.error('Error', error);
        }
      });
    }

    Alert.alert('Delete group', 'Are you sure you want to delete this group including all its messages?', [
      {
        text: 'Cancel',
        onPress: () => console.log('Cancel Pressed'),
        style: 'cancel'
      },
      {
        text: 'Delete',
        onPress: deleteTransaction,
        style: 'destructive'
      }
    ]);
  }

  return (
    <>
      {/* <Stack.Screen name="../../../" options={{ headerShown: false }} /> */}
      <YStack fullscreen>
        <XStack padding="$3" backgroundColor="$gray5" justifyContent="flex-end">
          <XCircle size="$1.5" onPress={() => router.back()} />
        </XStack>
        <YStack paddingTop="$3" flexGrow={1}>
          <XStack marginHorizontal="$3" gap="$3">
            <Input
              backgroundColor="white"
              flexGrow={1}
              onChangeText={(text) => setName(text)}
              value={name}
              borderRadius="$3"
            />
            <Button icon={<Save size="$1.5" />} backgroundColor="$brand1" color="white" onPress={handleSave} />
          </XStack>
          <MemberSelector selectedContacts={selectedContacts} setSelectedContacts={setSelectedContacts} />
          <Button
            icon={<Trash size="$1.5" />}
            backgroundColor="$red10"
            color="white"
            onPress={handleDelete}
            margin="$3"
          >
            Delete group
          </Button>
        </YStack>
      </YStack>
    </>
  );
}
