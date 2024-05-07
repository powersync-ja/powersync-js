import { Autocomplete, Box, Card, CardContent, FormControl, TextField, Typography } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePowerSync } from '@powersync/react';
import { LISTS_TABLE, ListRecord } from '@/library/powersync/AppSchema';
import { SearchResult, searchTable } from '@/app/utils/fts_helpers';
import { TODO_LISTS_ROUTE } from '@/app/router';

// This is a simple search bar widget that allows users to search for lists and todo items
export const SearchBarWidget: React.FC<any> = () => {
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);
  const [value, setValue] = React.useState<SearchResult | null>(null);

  const navigate = useNavigate();
  const powersync = usePowerSync();

  const handleInputChange = async (value: string) => {
    if (value.length !== 0) {
      let listsSearchResults: any[] = [];
      const todoItemsSearchResults = await searchTable(value, 'todos');
      for (let i = 0; i < todoItemsSearchResults.length; i++) {
        const res = await powersync.get<ListRecord>(`SELECT * FROM ${LISTS_TABLE} WHERE id = ?`, [
          todoItemsSearchResults[i]['list_id']
        ]);
        todoItemsSearchResults[i]['list_name'] = res.name;
      }
      if (!todoItemsSearchResults.length) {
        listsSearchResults = await searchTable(value, 'lists');
      }
      const formattedListResults: SearchResult[] = listsSearchResults.map(
        (result) => new SearchResult(result['id'], result['name'])
      );
      const formattedTodoItemsResults: SearchResult[] = todoItemsSearchResults.map((result) => {
        return new SearchResult(result['list_id'], result['list_name'] ?? '', result['description']);
      });
      setSearchResults([...formattedTodoItemsResults, ...formattedListResults]);
    }
  };

  return (
    <div>
      <FormControl sx={{ my: 1, display: 'flex' }}>
        <Autocomplete
          freeSolo
          id="autocomplete-search"
          options={searchResults}
          value={value?.id}
          getOptionLabel={(option) => {
            if (option instanceof SearchResult) {
              return option.todoName ?? option.listName;
            }
            return option;
          }}
          renderOption={(props, option) => (
            <Box component="li" {...props}>
              <Card variant="outlined" sx={{ display: 'flex', width: '100%' }}>
                <CardContent>
                  {option.listName && (
                    <Typography sx={{ fontSize: 18 }} color="text.primary" gutterBottom>
                      {option.listName}
                    </Typography>
                  )}
                  {option.todoName && (
                    <Typography sx={{ fontSize: 14 }} color="text.secondary">
                      {'\u2022'} {option.todoName}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Box>
          )}
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
