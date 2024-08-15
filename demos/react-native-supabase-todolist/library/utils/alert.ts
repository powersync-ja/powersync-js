import { Alert } from 'react-native';

export function alert(
  title = '',
  description: string | undefined = undefined,
  options: { confirmation: boolean; onConfirm: Function } = { confirmation: false, onConfirm: () => {} }
) {
  if (typeof window !== 'undefined' && typeof window.alert === 'function' && typeof window.confirm === 'function') {
    const message = `${title}\n${description}`;
    if (options.confirmation) {
      const confirm = window.confirm(message);
      if (confirm) {
        options.onConfirm();
      }
    } else {
      window.alert(message);
    }
  } else {
    if (options.confirmation) {
      Alert.alert(title, description, [{ text: 'Cancel' }, { text: 'OK', onPress: () => options.onConfirm() }], {
        cancelable: true
      });
    } else {
      Alert.alert(title, description);
    }
  }
}
