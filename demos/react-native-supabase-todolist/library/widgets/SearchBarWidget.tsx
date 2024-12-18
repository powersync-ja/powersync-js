import React from 'react';
import { usePowerSync } from '@powersync/react';
import { Autocomplete } from './AutoCompleteWidget';
import { SearchResult, searchTable } from '../fts/fts_helpers';
import { LIST_TABLE, ListRecord } from '../powersync/AppSchema';
import { router } from 'expo-router';

// This is a simple search bar widget that allows users to search for lists and todo items
export const SearchBarWidget: React.FC<any> = () => {
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);

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
      const formattedListResults: SearchResult[] = listsSearchResults.map((result): SearchResult => {
        return { id: result['id'], listName: result['name'], todoName: null };
      });
      const formattedTodoItemsResults: SearchResult[] = todoItemsSearchResults.map((result): SearchResult => {
        return { id: result['list_id'], listName: result['list_name'] ?? '', todoName: result['description'] };
      });
      setSearchResults([...formattedTodoItemsResults, ...formattedListResults]);
    }
  };

  return (
    <Autocomplete
      data={searchResults}
      onChange={handleInputChange}
      placeholder="Search"
      leftIcon={{ type: 'material-community', name: 'magnify' }}
      onPress={(id) => {
        router.back();
        router.push({
          pathname: 'views/todos/edit/[id]',
          params: { id: id }
        });
      }}
    />
  );
};
