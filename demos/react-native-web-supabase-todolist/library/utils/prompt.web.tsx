import React from 'react';

export type PromptOptions = { placeholder?: string };

// On web, `react-native-dialog` is unnecessary (and unsupported), so we use the browser's built-in
// prompt. This file is platform-selected by Metro, so `react-native-dialog` is never bundled for web.
export const PromptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;

export async function prompt(
  title = '',
  description = '',
  onInput: (input: string | null) => void | Promise<void> = () => {},
  options: PromptOptions = {}
) {
  const name = window.prompt([title, description].filter(Boolean).join('\n'), options.placeholder);
  await onInput(name);
}
