import { usePowerSync, useQuery } from '@powersync/react-native';
import { MessageSquare, Plus } from '@tamagui/lucide-icons';
import { Link, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { Input, ListItem, Text, XStack, YStack } from 'tamagui';

import { GroupIcon } from '@/components/groups/GroupIcon';
import { List } from '@/components/list';
import { ProfileIcon } from '@/components/profiles/ProfileIcon';
import { stringToRelativeDate } from '@/lib/date';

export default function ChatsIndex() {
  const [search, setSearch] = useState<string>('');
  const [contacts, setContacts] = useState<any[]>([]);
  const powerSync = usePowerSync();
  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      setSearch('');
      setContacts([]);
    });

    return unsubscribe;
  }, [navigation]);

  const { data: chats } = useQuery(
    `SELECT profiles.id as partner_id, profiles.name as name, profiles.handle as handle, 'contact' as type, m.created_at as last_message_at FROM chats LEFT JOIN profiles on chats.id = profiles.id LEFT JOIN (SELECT * FROM messages WHERE (sender_id, recipient_id, created_at) IN (SELECT sender_id, recipient_id, MAX(created_at) FROM messages GROUP BY group_id)) as m ON m.recipient_id = chats.id OR m.sender_id = chats.id WHERE (name LIKE '%' || ?1 || '%' OR handle LIKE '%' || ?1 || '%') GROUP BY profiles.id UNION
    SELECT groups.id as partner_id, groups.name as name, '' as handle, 'group' as type, m.created_at as last_message_at FROM groups LEFT JOIN (SELECT * FROM messages WHERE (group_id, created_at) IN (SELECT group_id, MAX(created_at) FROM messages GROUP BY group_id)) as m ON m.group_id = groups.id WHERE (name LIKE '%' || ?1 || '%') GROUP BY groups.id ORDER BY last_message_at DESC`,
    [search]
  );

  useEffect(() => {
    async function contactSearch() {
      const result = await powerSync.execute(
        "SELECT contacts.id, contacts.profile_id, profiles.name, profiles.handle, chats.id AS chat_id, 'new' as type FROM contacts LEFT JOIN profiles on profiles.id = contacts.profile_id LEFT JOIN chats ON (chats.id = profiles.id) WHERE (profiles.name LIKE '%' || ?1 || '%' OR profiles.handle LIKE '%' || ?1 || '%') AND chat_id IS NULL",
        [search]
      );
      setContacts(result.rows?._array ?? []);
    }

    if (search.length > 0) {
      contactSearch();
    } else {
      setContacts([]);
    }
  }, [search, setContacts]);

  const newGroup = search ? [{ type: 'create', name: search }] : [];

  return (
    <YStack fullscreen gap="$3" paddingTop="$3">
      <XStack marginHorizontal="$3" gap="$3">
        <Input
          backgroundColor="white"
          flexGrow={1}
          onChangeText={(text) => setSearch(text)}
          value={search}
          borderRadius="$3"
        />
      </XStack>
      <List
        placeholder={
          <XStack justifyContent="center" marginTop="$3">
            <Text>Time to start chatting!</Text>
          </XStack>
        }
        data={[...newGroup, ...contacts, ...chats]}
        renderItem={({ item }) =>
          item.type === 'create' ? (
            <Link
              href={{
                pathname: '/(app)/(chats)/g/create',
                params: { name: item.name }
              }}
            >
              <ListItem
                icon={<GroupIcon create={true} />}
                title={<Text color="$gray9">{item.name}</Text>}
                subTitle={<Text color="$gray9">Create new group</Text>}
                iconAfter={<Plus size="$1.5" />}
              />
            </Link>
          ) : (
            <Link href={`/(app)/(chats)/${item.type === 'group' ? 'g' : 'c'}/${item.partner_id}`}>
              <ListItem
                title={item.name}
                icon={item.type === 'group' ? <GroupIcon /> : <ProfileIcon handle={item.handle} />}
                subTitle={
                  item.type === 'new'
                    ? 'Start conversation'
                    : item.last_message_at
                      ? stringToRelativeDate(item.last_message_at)
                      : 'never'
                }
                iconAfter={item.type === 'new' ? <MessageSquare size="$1.5" /> : undefined}
              />
            </Link>
          )
        }
      />
    </YStack>
  );
}
