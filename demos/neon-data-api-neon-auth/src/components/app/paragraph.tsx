import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

type ParagraphProps = {
  id: string;
  content: string;
  timestamp: string;
};

type CurrentParagraphProps = {
  content: string;
  timestamp: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
};

// Format timestamp for display (HH:MM:SS)
const formatTime = (timestamp: string): string => {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

export function Paragraph({ content, timestamp }: Omit<ParagraphProps, "id">) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-sm w-20 shrink-0 pt-1">{formatTime(timestamp)}</div>
      <div className="flex-grow wrap-anywhere">{content}</div>
    </div>
  );
}

export function CurrentParagraph({
  content,
  timestamp,
  onChange,
  onKeyDown,
}: CurrentParagraphProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [content]);

  return (
    <div className="flex items-start gap-3">
      <div className="text-sm text-foreground/70 w-20 shrink-0 pt-1">
        {formatTime(timestamp)}
        <div className="flex items-center mt-1">
          <div className="h-2 w-2 rounded-full bg-amber-300 mr-1" />
          <span className="text-xs text-amber-400">unsaved</span>
        </div>
      </div>
      <div className="flex-grow">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="Empty paragraph"
          className={cn(
            "w-full border-none",
            "focus:outline-none",
            "resize-none text-foreground",
          )}
          rows={1}
        />
        <p className="text-xs text-foreground/50 mt-1">
          Press Enter to save paragraph. Paragraphs cannot be edited after
          saving.
        </p>
      </div>
    </div>
  );
}
