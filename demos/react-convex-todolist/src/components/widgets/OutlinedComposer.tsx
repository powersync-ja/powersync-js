import AddIcon from '@mui/icons-material/Add';
import { Box, IconButton, TextField } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';
import React from 'react';

export type OutlinedComposerSubmitSource = 'enter' | 'button' | 'submit';

export type OutlinedComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (source?: OutlinedComposerSubmitSource) => void | Promise<void>;
  placeholder: string;
  inputAriaLabel: string;
  submitAriaLabel: string;
  multiline?: boolean;
  minRows?: number;
  maxRows?: number;
  formSx?: SxProps<Theme>;
  autoFocus?: boolean;
};

export function OutlinedComposer(props: OutlinedComposerProps) {
  const {
    value,
    onChange,
    onSubmit,
    placeholder,
    inputAriaLabel,
    submitAriaLabel,
    multiline = true,
    minRows = 2,
    maxRows = 6,
    formSx,
    autoFocus = false
  } = props;

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();
    void onSubmit('submit');
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={[{ display: 'flex', alignItems: 'stretch', gap: 0.75 }, ...(formSx ? [formSx] : [])] as SxProps<Theme>}
    >
      <TextField
        fullWidth
        variant="outlined"
        autoFocus={autoFocus}
        multiline={multiline}
        minRows={multiline ? minRows : undefined}
        maxRows={multiline ? maxRows : undefined}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        InputProps={{
          onKeyDown: (e) => {
            if (multiline && e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void onSubmit('enter');
            }
            if (!multiline && e.key === 'Enter') {
              e.preventDefault();
              void onSubmit('enter');
            }
          }
        }}
        aria-label={inputAriaLabel}
        sx={(theme) => ({
          flex: 1,
          minWidth: 0,
          '& .MuiOutlinedInput-root': {
            ...(multiline
              ? {
                  height: '100%',
                  alignItems: 'flex-start'
                }
              : {}),
            fontSize: '1.0625rem',
            lineHeight: 1.45,
            py: multiline ? 1.25 : 1,
            backgroundColor: alpha(theme.palette.secondary.main, 0.08),
            '& fieldset': {
              borderWidth: 2,
              borderColor: alpha(theme.palette.secondary.main, 0.55)
            },
            '&:hover fieldset': {
              borderColor: theme.palette.secondary.main
            },
            '&.Mui-focused fieldset': {
              borderColor: theme.palette.secondary.main,
              borderWidth: 2
            }
          },
          '& .MuiInputBase-input': {
            py: multiline ? 0.5 : 1.125
          },
          '& .MuiInputBase-input::placeholder': {
            color: alpha(theme.palette.secondary.main, 0.75),
            opacity: 1
          }
        })}
      />
      <IconButton
        type="button"
        color="secondary"
        aria-label={submitAriaLabel}
        onClick={() => void onSubmit('button')}
        sx={(theme) => ({
          alignSelf: 'stretch',
          flexShrink: 0,
          width: theme.spacing(7),
          minHeight: 0,
          border: '2px solid',
          borderColor: 'secondary.main',
          borderRadius: theme.shape.borderRadius
        })}
      >
        <AddIcon fontSize="medium" />
      </IconButton>
    </Box>
  );
}
