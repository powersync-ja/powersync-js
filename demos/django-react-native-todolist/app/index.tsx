import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import Logger from 'js-logger';
/**
 * This is the entry point when the app loads.
 * Checks for a Supabase session.
 *  - If one is present redirect to app views.
 *  - If not, reditect to login/register flow
 */
const App = () => {
  React.useEffect(() => {
    Logger.useDefaults();
    Logger.setLevel(Logger.DEBUG);

    setImmediate(() => router.replace('signin'));
  }, []);

  return (
    <View style={{ flex: 1, flexGrow: 1, alignContent: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>
  );
};

export default App;
