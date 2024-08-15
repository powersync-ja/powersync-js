import rnPrompt from 'react-native-prompt-android';

export async function prompt(
  title = '',
  description = '',
  onInput = (_input: string | null): void | Promise<void> => {},
  options: { placeholder: string | undefined } = { placeholder: undefined }
) {
  let name: string | null = null;

  // Check if window.prompt is available
  if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
    name = window.prompt(`${title}\n${description}`, options.placeholder);
  } else {
    // Use react-native-prompt-android if window.prompt is not available
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
