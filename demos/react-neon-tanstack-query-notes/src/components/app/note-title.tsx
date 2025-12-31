import { powersyncDrizzle } from '@/lib/powersync';
import { queryKeys } from '@/lib/query-keys';
import { useQueryClient } from '@tanstack/react-query';
import { Copy } from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { eq, type InferSelectModel } from 'drizzle-orm';
import { notes } from '@/lib/powersync-schema';

type Note = InferSelectModel<typeof notes>;

export function NoteTitle({
  id,
  title,
  shared,
  owner
}: {
  id: string;
  title: string;
  shared: boolean;
  owner: boolean;
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(title);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Focus title when editing
  useEffect(() => {
    if (isEditingTitle && titleRef.current) {
      titleRef.current.focus();
      // Place cursor at the end of text
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(titleRef.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [isEditingTitle]);

  const handleTitleEdit = () => {
    setIsEditingTitle(true);
  };

  const handleTitleKeyDown = (e: KeyboardEvent<HTMLHeadingElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveTitle();
    }
  };

  const queryClient = useQueryClient();

  const saveTitle = async () => {
    if (titleRef.current && titleRef.current.textContent !== null && id) {
      const newTitle = titleRef.current.textContent.trim();
      if (newTitle !== title) {
        try {
          await powersyncDrizzle
            .update(notes)
            .set({ title: newTitle, updated_at: new Date().toISOString() })
            .where(eq(notes.id, id));

          queryClient.setQueryData(queryKeys.note(id), (old: Note) => ({
            ...old,
            title: newTitle
          }));

          queryClient.invalidateQueries({ queryKey: queryKeys.notes() });

          setTitleValue(newTitle);
        } catch (err) {
          console.error('Failed to update title', err);
          // Restore original title on error
          if (titleRef.current) {
            titleRef.current.textContent = titleValue;
          }
        }
      }
    }
    setIsEditingTitle(false);
  };

  return (
    <div className="flex items-center gap-2">
      Title:
      <h3
        ref={titleRef}
        className="cursor-text font-medium outline-none focus:outline-none"
        contentEditable={isEditingTitle}
        suppressContentEditableWarning
        onBlur={saveTitle}
        onKeyDown={handleTitleKeyDown}
        onClick={!isEditingTitle ? handleTitleEdit : undefined}
      >
        {titleValue}
      </h3>
      {shared && owner && (
        <Copy
          className="w-3 h-3 text-foreground/70 cursor-pointer"
          onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/note?id=${id}`);
          }}
        />
      )}
    </div>
  );
}
