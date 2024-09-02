import _ from 'lodash';
import React from 'react';
import { Table, Row } from 'react-native-reanimated-table';
import { QueryResult } from '@powersync/common';
import { useSystem } from '../../library/powersync/system';
import { ScrollView, TextInput } from 'react-native-gesture-handler';

const DEFAULT_QUERY = 'SELECT * from lists';

const App: React.FC = () => {
  const { powersync } = useSystem();
  const [output, setOutput] = React.useState<QueryResult | null>(null);

  const executeQuery = React.useCallback(
    _.debounce(async (query: string) => {
      console.debug('executing query', query);
      const result = await powersync.execute(query);
      setOutput(result);
    }, 1000),
    []
  );

  React.useEffect(() => {
    executeQuery(DEFAULT_QUERY);
  }, []);

  const rows = output?.rows?._array ?? [];
  const firstItem = output?.rows?.item(0);
  const cellKeys = firstItem ? Object.keys(firstItem) : [];

  return (
    <ScrollView key={'console'} style={{ flex: 1, flexGrow: 1 }}>
      <TextInput defaultValue={DEFAULT_QUERY} onChangeText={executeQuery} />
      {output ? (
        <Table borderStyle={{ borderWidth: 2 }}>
          <Row style={{ backgroundColor: '#999' }} data={cellKeys} />
          {rows.map((row, index) => (
            <Row key={index.toString()} data={cellKeys.map((key) => row[key])} />
          ))}
        </Table>
      ) : null}
    </ScrollView>
  );
};

export default App;
