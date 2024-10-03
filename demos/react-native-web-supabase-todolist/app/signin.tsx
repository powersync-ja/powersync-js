import * as React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSystem } from '../library/powersync/system';
import { Button } from 'react-native';
import { TextInputWidget } from '../library/widgets/TextInputWidget';
import { Icon } from 'react-native-elements';

export default function Signin() {
  const { supabaseConnector } = useSystem();
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
          <Icon name={'login'} size={100} type="material-community" style={{ padding: 5 }} />
          <TextInputWidget
            style={SignInStyles.input}
            inputMode={'email'}
            placeholder={'Username'}
            autoCapitalize={'none'}
            onChangeText={(value) => setCredentials({ ...credentials, username: value.toLowerCase().trim() })}
          />
          <TextInputWidget
            style={SignInStyles.input}
            placeholder="Password"
            secureTextEntry={true}
            onChangeText={(value) => setCredentials({ ...credentials, password: value })}
          />
          {error ? <Text style={{ color: 'red' }}>{error}</Text> : null}
          <View style={SignInStyles.button_container}>
            <Button
              title="Login"
              onPress={async () => {
                setLoading(true);
                setError('');
                try {
                  await supabaseConnector.login(credentials.username, credentials.password);
                  router.replace('views/todos/lists');
                } catch (ex: any) {
                  console.error(ex);
                  setError(ex.message || 'Could not authenticate');
                } finally {
                  setLoading(false);
                }
              }}
            />
          </View>
          <View style={SignInStyles.button_container}>
            <Button
              title="Register"
              onPress={async () => {
                router.push('register');
              }}
            />
          </View>
        </View>
      )}
    </View>
  );
}

export const SignInStyles = StyleSheet.create({
  input: {
    fontSize: 14
  },
  button_container: {
    marginTop: 20
  }
});
