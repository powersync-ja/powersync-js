import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, Button } from 'react-native';

import { useSystem } from '../library/stores/system';
import { TextInputWidget } from '../library/widgets/TextInputWidget';
import { SignInStyles } from './signin';
import { Icon } from 'react-native-elements';
import { router } from 'expo-router';

export default function Register() {
  const { djangoConnector } = useSystem();
  const [loading, setLoading] = React.useState(false);
  const [credentials, setCredentials] = React.useState({ username: '', password: '' });
  const [error, setError] = React.useState('');

  return (
    <View style={{ flexGrow: 1, alignContent: 'center', justifyContent: 'center' }}>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <View style={{ padding: 20, maxWidth: 400 }}>
          <StatusBar style={'auto'} />
          <Icon name={'clipboard-account'} size={100} type="material-community" style={{ padding: 5 }} />

          <TextInputWidget
            placeholder="Username"
            autoCapitalize="none"
            onChangeText={(value) => setCredentials({ ...credentials, username: value })}
          />
          <TextInputWidget
            placeholder="Password"
            secureTextEntry={true}
            onChangeText={(value) => setCredentials({ ...credentials, password: value })}
          />
          {error ? <Text style={{ color: 'red' }}>{error}</Text> : null}
          <View style={SignInStyles.button_container}>
            <Button
              title="Sign Up"
              onPress={async () => {
                setLoading(true);
                setError('');
                try {
                  await djangoConnector.register(credentials.username, credentials.password);
                  router.replace('signin');
                } catch (ex: any) {
                  console.error(ex);
                  setError(ex.message || 'Could not register');
                } finally {
                  setLoading(false);
                }
              }}
            />
          </View>
        </View>
      )}
    </View>
  );
}
