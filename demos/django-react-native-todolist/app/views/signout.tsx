import * as React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';

import { useSystem } from '../../library/stores/system';

export default function Signout() {
  const { powersync, supabaseConnector } = useSystem();

  React.useEffect(() => {
    (async () => {
      await powersync.disconnectAndClear();
      await supabaseConnector.supabaseClient.auth.signOut();
      router.replace('signin');
    })();
  }, []);

  return (
    <View style={{ flexGrow: 1, alignContent: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
