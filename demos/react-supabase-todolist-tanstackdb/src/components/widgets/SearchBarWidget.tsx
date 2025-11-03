import { TODO_LISTS_ROUTE } from '@/app/router';
import { Autocomplete, Box, Card, CardContent, FormControl, TextField, Typography } from '@mui/material';
import { eq, like, useLiveQuery } from '@tanstack/react-db';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { listsCollection, todosCollection } from '../providers/SystemProvider';

class SearchResult {
  constructor(
    public id: string,
    public listName: string,
    public todoName?: string
  ) {}
}

// This is a simple search bar widget that allows users to search for lists and todo items
export const SearchBarWidget: React.FC<any> = () => {
  const [value, setValue] = React.useState<SearchResult | null>(null);
  const [searchInput, setSearchInput] = React.useState<string | null>(null);

  const navigate = useNavigate();

  const { data: todoMatches } = useLiveQuery(
    (q) =>
      q
        .from({ todos: todosCollection })
        .where(({ todos }) => like(todos.description, `%${searchInput}%`))
        .join({ lists: listsCollection }, ({ todos, lists }) => eq(todos.list_id, lists.id))
        .select(({ todos, lists }) => ({
          id: todos.id,
          list_id: todos.list_id,
          list_name: lists!.name,
          description: todos.description
        })),
    [searchInput]
  );

  const { data: listMatches } = useLiveQuery(
    (q) => q.from({ lists: listsCollection }).where(({ lists }) => like(lists.name, `%${searchInput}%`)),
    [searchInput]
  );

  const searchResults = [
    ...todoMatches.map((todo) => new SearchResult(todo.id, todo.list_name, todo.description)),
    ...listMatches.map((list) => new SearchResult(list.id, list.name))
  ];

  const handleInputChange = async (value: string) => {
    setSearchInput(value == '' ? null : value);
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
