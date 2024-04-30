import { useQuery } from '@powersync/react-native';
import { CheckCircle2, Circle } from '@tamagui/lucide-icons';
import { useState } from 'react';
import { Input, ListItem, XStack, YStack } from 'tamagui';

import { List } from '../list';
import { ProfileIcon } from '../profiles/ProfileIcon';

export function MemberSelector({
  selectedContacts,
  setSelectedContacts
}: {
  selectedContacts: Set<string>;
  setSelectedContacts: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const [search, setSearch] = useState<string>('');

  const { data: contacts } = useQuery(
    "SELECT contacts.id, profiles.id as profile_id, profiles.name, profiles.handle, 'contact' as type FROM contacts LEFT JOIN profiles ON contacts.profile_id = profiles.id WHERE (profiles.name LIKE '%' || ?1 || '%' OR profiles.handle LIKE '%' || ?1 || '%') ORDER BY name ASC",
    [search]
  );

  function handleContactSelection(contactId: string) {
    if (selectedContacts.has(contactId)) {
      const newSet = new Set(selectedContacts);
      newSet.delete(contactId);
      setSelectedContacts(newSet);
    } else {
      setSelectedContacts((prev) => new Set(prev).add(contactId));
    }
  }

  return (
    <YStack gap="$3" paddingTop="$3" flexGrow={1}>
      <XStack marginHorizontal="$3" gap="$3">
        <Input
          backgroundColor="$gray1"
          flexGrow={1}
          onChangeText={(text) => setSearch(text)}
          // onSubmitEditing={handleProfileSearch}
          value={search}
          borderRadius="$3"
        />
      </XStack>

      <List
        data={[...contacts]}
        renderItem={({ item }) => (
          <ListItem
            title={item.name}
            subTitle={`@${item.handle}`}
            icon={<ProfileIcon handle={item.handle ?? ''} />}
            iconAfter={selectedContacts.has(item.profile_id) ? <CheckCircle2 size="$1.5" /> : <Circle size="$1.5" />}
            onPress={() => handleContactSelection(item.profile_id)}
          />
        )}
      />
    </YStack>
  );
}
