import { Redirect } from 'expo-router';

import { SignIn } from '@/components/auth/SignIn';
import { useAuth } from '@/providers/AuthProvider';

export default function SignInScreen() {
  const { user } = useAuth();

  if (user) {
    return <Redirect href="/" />;
  }

  return <SignIn />;
}
