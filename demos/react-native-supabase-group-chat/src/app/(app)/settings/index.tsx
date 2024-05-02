import { usePowerSync, useQuery } from '@powersync/react-native';
import { useEffect, useState } from 'react';
import { Button, Input, Label, Switch, Text, XStack, YStack } from 'tamagui';

import { useAuth } from '@/providers/AuthProvider';

export default function SettingsIndex() {
  const powerSync = usePowerSync();
  const { user, signOut, isSyncEnabled, setIsSyncEnabled } = useAuth();
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');

  const { data: profiles } = useQuery('SELECT * FROM profiles WHERE id = ?', [user?.id]);

  useEffect(() => {
    if (profiles.length > 0) {
      setName(profiles[0].name);
      setHandle(profiles[0].handle);
    }
  }, [profiles]);

  async function handleSignOut() {
    await powerSync.disconnectAndClear().catch((error) => console.error(error));
    signOut();
  }

  async function handleUpdateProfile() {
    if (user) {
      powerSync.execute('UPDATE profiles SET name = ?, handle = ? WHERE id = ?', [name, handle, user.id]);
    }
  }

  useEffect(() => {
    console.log('Sync Status 2', powerSync.currentStatus);
  }, [powerSync]);

  return (
    <YStack padding="$3" gap="$3">
      <Text>Email: {user?.email}</Text>

      <XStack width={200} alignItems="center" space="$4">
        <Switch
          id="syncEnabled"
          size="$4"
          checked={isSyncEnabled}
          onCheckedChange={(checked) => setIsSyncEnabled(checked)}
        >
          <Switch.Thumb animation="quick" backgroundColor="$brand1" />
        </Switch>
        <Label paddingRight="$0" minWidth={90} justifyContent="flex-end" size="$3" htmlFor="syncEnabled">
          Sync {isSyncEnabled ? 'enabled' : 'disabled'}
        </Label>
      </XStack>
      <Input placeholder="Name" width="80%" onChangeText={(text) => setName(text)} value={name} />
      <Input
        placeholder="Handle"
        width="80%"
        onChangeText={(text) => setHandle(text)}
        value={handle}
        autoCapitalize="none"
      />
      <Button backgroundColor="$brand1" color="white" onPress={handleUpdateProfile}>
        Update profile
      </Button>
      <Button onPress={handleSignOut}>Sign out</Button>
    </YStack>
  );
}
