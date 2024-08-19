import { Platform } from 'react-native';
import rnPrompt from 'react-native-prompt-android';

export async function prompt(
  title = '',
  description = '',
  onInput = (_input: string | null): void | Promise<void> => {},
  options: { placeholder: string | undefined } = { placeholder: undefined }
) {
  const isWeb = Platform.OS === 'web';
  let name: string | null = null;

  if (isWeb) {
    name = window.prompt(`${title}\n${description}`, options.placeholder);
  } else {
    name = await new Promise((resolve) => {
      rnPrompt(
        title,
        description,
        (input) => {
          resolve(input);
        },
        { placeholder: options.placeholder, style: 'shimo' }
      );
    });
  }

  await onInput(name);
}
