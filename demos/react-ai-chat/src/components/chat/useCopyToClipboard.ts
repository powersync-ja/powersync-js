import React from 'react';

/** Copies text to the clipboard. `copied` stays true for a moment afterwards, to confirm it. */
export function useCopyToClipboard() {
  const [copied, setCopied] = React.useState(false);

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return { copied, copy };
}
