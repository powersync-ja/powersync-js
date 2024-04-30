import { faker } from '@faker-js/faker';
import { usePowerSync, useQuery } from '@powersync/react-native';
import { Search, Shuffle } from '@tamagui/lucide-icons';
import { useState } from 'react';
import { Button, Input, XStack, YStack } from 'tamagui';

import { ContactRow } from '@/components/contacts/ContactRow';
import { ProfileRow } from '@/components/contacts/ProfileRow';
import { List } from '@/components/list';
import { supabase } from '@/lib/supabase';
import { uuid } from '@/lib/uuid';
import { useAuth } from '@/providers/AuthProvider';

export default function ContactsIndex() {
  const powerSync = usePowerSync();
  const { user } = useAuth();
  const [search, setSearch] = useState<string>('');
  const [profiles, setProfiles] = useState<any[]>([]);

  const { data: contacts } = useQuery(
    "SELECT contacts.id, profiles.id as profile_id, profiles.name, profiles.handle, 'contact' as type FROM contacts LEFT JOIN profiles ON contacts.profile_id = profiles.id WHERE (profiles.name LIKE '%' || ?1 || '%' OR profiles.handle LIKE '%' || ?1 || '%') ORDER BY name ASC",
    [search]
  );

  async function handleAddRandomContact() {
    const name = faker.person.firstName();
    const handle = faker.helpers.slugify(name).toLowerCase();
    const profileId = uuid();
    const contactId = uuid();
    const ownerId = user?.id;

    await powerSync.execute('INSERT INTO profiles (id, name, handle, demo) VALUES (?, ?, ?, ?)', [
      profileId,
      name,
      handle,
      true
    ]);

    await powerSync.execute('INSERT INTO contacts (id, owner_id, profile_id) VALUES (?, ?, ?)', [
      contactId,
      ownerId,
      profileId
    ]);

    /* await powerSync.writeTransaction(async (tx) => {
      try {
        tx.executeAsync(
          "INSERT INTO profiles (id, name, handle, demo) VALUES (?, ?, ?, ?)",
          [profileId, name, handle, true],
        );
        tx.executeAsync(
          "INSERT INTO contacts (id, owner_id, profile_id) VALUES (?, ?, ?)",
          [contactId, ownerId, profileId],
        );
      } catch (error) {
        console.error("Error", error);
      }
    }); */
  }

  async function handleAddContact(profileId: string, name: string, handle: string) {
    const contactId = uuid();
    const ownerId = user?.id;

    await powerSync.execute('INSERT INTO contacts (id, owner_id, profile_id) VALUES (?, ?, ?)', [
      contactId,
      ownerId,
      profileId
    ]);

    /* await powerSync.execute(
      "INSERT INTO profiles (id, name, handle) VALUES (?, ?, ?)",
      [profileId, name, handle]
    ); */

    setSearch('');
    setProfiles([]);
  }

  async function handleDeleteContact(contactId: string) {
    console.log('Deleting contact', contactId);

    const result = await powerSync.execute('DELETE FROM contacts WHERE id = ?', [contactId]);
  }

  async function handleProfileSearch() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, handle')
      .filter('handle', 'ilike', `%${search}%`)
      .filter('id', 'not.eq', user?.id);

    setProfiles(data ?? []);
  }

  return (
    <YStack fullscreen gap="$3" paddingTop="$3">
      <XStack marginHorizontal="$3" gap="$3">
        <Input
          backgroundColor="$gray1"
          flexGrow={1}
          onChangeText={(text) => setSearch(text)}
          onSubmitEditing={handleProfileSearch}
          value={search}
          borderRadius="$3"
        />
        <Button
          color="white"
          // borderColor="$brand1"
          // borderWidth="$1"
          onPress={handleProfileSearch}
          icon={<Search size="$1.5" />}
          backgroundColor="$brand1"
          borderRadius="$3"
          // circular
        />
      </XStack>

      <List
        data={[...profiles, ...contacts]}
        extraData={contacts}
        renderItem={({ item }) =>
          item.type === 'contact' ? (
            <ContactRow item={item} handleDeleteContact={handleDeleteContact} />
          ) : (
            <ProfileRow item={item} handleAddContact={handleAddContact} />
          )
        }
      />

      <Button margin="$3" icon={<Shuffle size="$1.5" />} onPress={handleAddRandomContact}>
        Add random contact
      </Button>
    </YStack>
  );
}
