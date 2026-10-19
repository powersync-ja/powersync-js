import { ArrowUp, Square } from 'lucide-react';
import React from 'react';

const MAX_HEIGHT = 240;

export type ComposerProps = {
  onSend: (text: string) => void;
  /** Set while a reply is generating: the send button becomes a stop button. */
  onStop?: () => void;
  autoFocus?: boolean;
};

export function Composer({ onSend, onStop, autoFocus }: ComposerProps) {
  const [text, setText] = React.useState('');
  const textarea = React.useRef<HTMLTextAreaElement>(null);

  // Grow with the text, up to MAX_HEIGHT.
  React.useLayoutEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [text]);

  // Escape stops the reply, wherever the focus is.
  const handleKeyDown = React.useEffectEvent((event: KeyboardEvent) => {
    if (event.key === 'Escape' && !event.isComposing) onStop?.();
  });
  React.useEffect(() => {
    const listener = (event: KeyboardEvent) => handleKeyDown(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  const submit = () => {
    const value = text.trim();
    if (!value || onStop) return;
    setText('');
    onSend(value);
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="rounded-[26px] border border-line bg-raised p-2.5 shadow-[0_2px_16px_rgb(0_0_0/0.05)] transition-colors focus-within:border-muted/50"
    >
      <textarea
        ref={textarea}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            submit();
          }
        }}
        rows={1}
        autoFocus={autoFocus}
        placeholder="Ask anything"
        className="block w-full resize-none bg-transparent px-2.5 pt-1.5 pb-1 text-[15px] leading-6 outline-none placeholder:text-muted"
      />
      <div className="flex justify-end">
        {onStop ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generating"
            aria-keyshortcuts="Escape"
            title="Stop generating (Esc)"
            className="flex size-9 items-center justify-center rounded-full bg-ink text-surface transition-opacity hover:opacity-80"
          >
            <Square className="size-3.5" fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!text.trim()}
            aria-label="Send message"
            className="flex size-9 items-center justify-center rounded-full bg-brand text-white transition-opacity hover:opacity-90 disabled:opacity-30"
          >
            <ArrowUp className="size-5" strokeWidth={2.25} />
          </button>
        )}
      </div>
    </form>
  );
}
