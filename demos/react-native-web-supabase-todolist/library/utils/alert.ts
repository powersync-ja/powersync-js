import { Alert, Platform } from 'react-native';

export function alert(
  title = '',
  description: string = '',
  options: { confirmation: boolean; onConfirm: Function } = { confirmation: false, onConfirm: () => {} }
) {
  const isWeb = Platform.OS === 'web';

  if (isWeb) {
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
