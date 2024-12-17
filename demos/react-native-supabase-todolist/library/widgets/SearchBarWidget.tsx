// import { Autocomplete, Box, Card, CardContent, FormControl, TextField, Typography } from '@mui/material';
import React from 'react';
import { usePowerSync } from '@powersync/react';
import { Autocomplete } from './AutoCompleteWidget';
import { SearchResult, searchTable } from '../fts/fts_helpers';
import { LIST_TABLE, TODO_TABLE, ListRecord } from '../powersync/AppSchema';

// This is a simple search bar widget that allows users to search for lists and todo items
export const SearchBarWidget: React.FC<any> = () => {
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);
  const [value, setValue] = React.useState<SearchResult | null>(null);

  // const navigate = useNavigate();
  const powersync = usePowerSync();

  const handleInputChange = async (value: string) => {
    if (value.length !== 0) {
      let listsSearchResults: any[] = [];
      const todoItemsSearchResults = await searchTable(value, 'todos');
      for (let i = 0; i < todoItemsSearchResults.length; i++) {
        const res = await powersync.get<ListRecord>(`SELECT * FROM ${LIST_TABLE} WHERE id = ?`, [
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

  return <Autocomplete origValue="" data={searchResults} onChange={handleInputChange} />;
};
