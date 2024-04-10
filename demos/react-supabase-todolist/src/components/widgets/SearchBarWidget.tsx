import { TextField } from '@mui/material';
import React from 'react';

export const SearchBarWidget: React.FC<any> = (props) => {
  const [searchInput, setSearchInput] = React.useState('');
  const nameInputRef = React.createRef<HTMLInputElement>();

  const handleChange = (e: { target: { value: string } }) => {
    // e.preventDefault();
    setSearchInput(e.target.value);
    console.log('searchInput:', searchInput);
  };

  return <TextField sx={{ marginTop: '10px' }} fullWidth inputRef={nameInputRef} label="Search" />;
};
