import { SearchResult, searchTable } from '@/app/utils/fts_helpers';
import { Autocomplete, FormControl, TextField } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TODO_LISTS_ROUTE } from '@/app/router';

// This is a simple search bar widget that allows users to search for lists and todo items
export const SearchBarWidget: React.FC<any> = (props) => {
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);
  const [value, setValue] = React.useState<SearchResult | null>(null);

  const navigate = useNavigate();

  const handleInputChange = async (value: string) => {
    if (value.length !== 0) {
      let listsSearchResults = await searchTable(value, 'lists');
      let todoItemsSearchResults = await searchTable(value, 'todos');
      let formattedListResults: SearchResult[] = listsSearchResults.map(
        (result) => new SearchResult(result['id'], result['name'])
      );
      let formattedTodoItemsResults: SearchResult[] = todoItemsSearchResults.map(
        (result) => new SearchResult(result['list_id'], result['description'])
      );
      setSearchResults([...formattedListResults, ...formattedTodoItemsResults]);
    }
  };

  return (
    <div>
      <FormControl sx={{ my: 1, display: 'flex' }}>
        <Autocomplete
          freeSolo
          id="autocomplete-search"
          options={searchResults}
          value={value?.name}
          getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
          filterOptions={(x) => x}
          onInputChange={(event, newInputValue, reason) => {
            if (reason === 'clear') {
              setValue(null);
              setSearchResults([]);
              return;
            }
            handleInputChange(newInputValue);
          }}
          onChange={(event, newValue, reason) => {
            if (reason === 'selectOption') {
              if (newValue instanceof SearchResult) {
                navigate(TODO_LISTS_ROUTE + '/' + newValue.id);
              }
            }
          }}
          selectOnFocus
          clearOnBlur
          handleHomeEndKeys
          renderInput={(params) => (
            <TextField
              {...params}
              label="Search..."
              InputProps={{
                ...params.InputProps
              }}
            />
          )}
        />
      </FormControl>
    </div>
  );
};
