import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useSystem } from '../library/powersync/system';
import { router } from 'expo-router';
import Logger from 'js-logger';

/**
 * This is the entry point when the app loads.
 * Checks for a Supabase session.
 *  - If one is present redirect to app views.
 *  - If not, reditect to login/register flow
 */
const App: React.FC = () => {
  const { supabaseConnector } = useSystem();

  React.useEffect(() => {
    Logger.useDefaults();
    Logger.setLevel(Logger.DEBUG);
    supabaseConnector.client.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) {
          router.replace('views/todos/lists');
        } else {
          throw new Error('Signin required');
        }
      })
      .catch(() => {
        router.replace('signin');
      });
  }, []);

  return (
    <View key={`loader`} style={{ flex: 1, flexGrow: 1, alignContent: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>
  );
};

export default App;
