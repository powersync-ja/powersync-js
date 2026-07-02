import React, { useCallback, useEffect, useRef, useState } from 'react';
import Dialog from 'react-native-dialog';

export type PromptOptions = { placeholder?: string };

type ShowPrompt = (args: { title: string; description: string; options: PromptOptions }) => Promise<string | null>;

// Module-level bridge so the imperative `prompt()` API can drive the rendered <PromptProvider>.
let showNativePrompt: ShowPrompt | null = null;

/**
 * Renders a native (iOS/Android) text-input dialog via `react-native-dialog` (pure JS — no native
 * module, so no Gradle/autolinking concerns). Mount this once near the app root. The imperative
 * `prompt()` below resolves against this provider. On web, `prompt.web.tsx` is used instead
 * (browser `window.prompt`), so `react-native-dialog` is never bundled for web.
 */
export const PromptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [placeholder, setPlaceholder] = useState<string | undefined>(undefined);
  const [value, setValue] = useState('');
  const resolverRef = useRef<((result: string | null) => void) | null>(null);

  useEffect(() => {
    showNativePrompt = ({ title, description, options }) =>
      new Promise<string | null>((resolve) => {
        setTitle(title);
        setDescription(description);
        setPlaceholder(options.placeholder);
        setValue('');
        resolverRef.current = resolve;
        setVisible(true);
      });
    return () => {
      showNativePrompt = null;
    };
  }, []);

  const finish = useCallback((result: string | null) => {
    setVisible(false);
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(result);
  }, []);

  return (
    <>
      {children}
      <Dialog.Container visible={visible} onBackdropPress={() => finish(null)}>
        {title ? <Dialog.Title>{title}</Dialog.Title> : null}
        {description ? <Dialog.Description>{description}</Dialog.Description> : null}
        <Dialog.Input placeholder={placeholder} value={value} onChangeText={setValue} autoFocus />
        <Dialog.Button label="Cancel" onPress={() => finish(null)} />
        <Dialog.Button label="OK" onPress={() => finish(value)} />
      </Dialog.Container>
    </>
  );
};

export async function prompt(
  title = '',
  description = '',
  onInput: (input: string | null) => void | Promise<void> = () => {},
  options: PromptOptions = {}
) {
  const name = showNativePrompt ? await showNativePrompt({ title, description, options }) : null;
  await onInput(name);
}
