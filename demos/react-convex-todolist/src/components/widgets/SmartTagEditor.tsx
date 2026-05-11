import CloseIcon from '@mui/icons-material/Close';
import { Box, Chip, InputBase, type SxProps, type Theme } from '@mui/material';
import React from 'react';

const MAX_TAG_LEN = 48;

export type SmartTagEditorProps = {
  tags: string[];
  onTagsChange: (next: string[]) => void | Promise<void>;
  /** Lets chips participate in a parent flex-wrap row. */
  sx?: SxProps<Theme>;
  disabled?: boolean;
};

/**
 * Tags as pills with add, inline edit, and delete. Root uses `display: contents` so chips can sit in a
 * parent wrapping flex row alongside other controls.
 */
export function SmartTagEditor(props: SmartTagEditorProps) {
  const { tags, onTagsChange, sx, disabled } = props;
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [editDraft, setEditDraft] = React.useState('');
  const [addDraft, setAddDraft] = React.useState('');
  const editInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (editingIndex !== null) {
      editInputRef.current?.focus();
      editInputRef.current?.select?.();
    }
  }, [editingIndex]);

  const commitEdit = async () => {
    if (editingIndex === null) return;
    const raw = editDraft.trim();
    if (!raw) {
      const next = tags.filter((_, i) => i !== editingIndex);
      setEditingIndex(null);
      await onTagsChange(next);
      return;
    }
    const truncated = raw.slice(0, MAX_TAG_LEN);
    if (tags.some((t, i) => i !== editingIndex && t.toLowerCase() === truncated.toLowerCase())) {
      setEditingIndex(null);
      return;
    }
    const next = tags.map((t, i) => (i === editingIndex ? truncated : t));
    setEditingIndex(null);
    await onTagsChange(next);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
  };

  const removeAt = async (index: number) => {
    const next = tags.filter((_, i) => i !== index);
    if (editingIndex === index) setEditingIndex(null);
    else if (editingIndex !== null && editingIndex > index) setEditingIndex(editingIndex - 1);
    await onTagsChange(next);
  };

  const startEdit = (index: number) => {
    if (disabled) return;
    setEditingIndex(index);
    setEditDraft(tags[index] ?? '');
  };

  const addTag = async () => {
    const raw = addDraft.trim();
    if (!raw) return;
    const truncated = raw.slice(0, MAX_TAG_LEN);
    if (tags.some((t) => t.toLowerCase() === truncated.toLowerCase())) {
      setAddDraft('');
      return;
    }
    setAddDraft('');
    await onTagsChange([...tags, truncated]);
  };

  return (
    <Box sx={{ display: 'contents', ...sx }}>
      {tags.map((tag, index) =>
        editingIndex === index ? (
          <InputBase
            key={`edit-${index}`}
            inputRef={editInputRef}
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            onBlur={() => void commitEdit()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void commitEdit();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
              }
            }}
            disabled={disabled}
            sx={{
              minWidth: 72,
              maxWidth: 200,
              px: 1,
              py: 0.25,
              fontSize: '0.8125rem',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'action.hover'
            }}
            inputProps={{ 'aria-label': 'Edit tag', maxLength: MAX_TAG_LEN }}
          />
        ) : (
          <Chip
            key={`tag-${index}-${tag}`}
            label={tag}
            size="small"
            variant="outlined"
            onClick={() => startEdit(index)}
            onDelete={disabled ? undefined : () => void removeAt(index)}
            deleteIcon={<CloseIcon />}
            disabled={disabled}
            sx={{
              maxWidth: 220,
              '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
              cursor: disabled ? 'default' : 'pointer'
            }}
          />
        )
      )}
      <InputBase
        placeholder="Add tag"
        value={addDraft}
        onChange={(e) => setAddDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void addTag();
          }
        }}
        disabled={disabled}
        sx={{
          minWidth: 88,
          maxWidth: 160,
          px: 1,
          py: 0.25,
          fontSize: '0.8125rem',
          borderRadius: 1,
          border: '1px dashed',
          borderColor: 'divider',
          bgcolor: 'transparent'
        }}
        inputProps={{ 'aria-label': 'Add tag', maxLength: MAX_TAG_LEN }}
      />
    </Box>
  );
}
