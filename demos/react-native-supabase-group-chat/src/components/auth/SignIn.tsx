import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input, Square, XStack, YStack } from 'tamagui';

import { Logo } from '../Logo';

import { config } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

export function SignIn() {
  const inlets = useSafeAreaInsets();
  const [signUp, setSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn } = useAuth();

  async function handleSignUp() {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      console.error(error);
    } else {
      signIn(data);
    }
  }

  async function handleSignIn() {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error(error);
    } else {
      signIn(data);
    }
  }

  return (
    <YStack padding="$3" paddingTop={inlets.top} space="$3" justifyContent="center" alignItems="center" fullscreen>
      <Square size="$8" marginBottom="$10">
        <Logo color={config.brand1} gradient={true} />
      </Square>
      <Input
        placeholder="Email"
        width="100%"
        value={email}
        onChangeText={(t) => setEmail(t)}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />
      <Input
        placeholder="Password"
        width="100%"
        value={password}
        onChangeText={(t) => setPassword(t)}
        secureTextEntry={true}
      />
      {signUp ? (
        <XStack alignItems="center" gap="$3">
          <Button onPress={async () => await handleSignUp()}>Sign up</Button>
          <Button unstyled onPress={() => setSignUp(false)}>
            Back to sign in
          </Button>
        </XStack>
      ) : (
        <XStack alignItems="center" gap="$3">
          <Button onPress={async () => await handleSignIn()}>Sign in</Button>
          <Button unstyled onPress={() => setSignUp(true)}>
            No account yet? Sign up now.
          </Button>
        </XStack>
      )}
    </YStack>
  );
}
