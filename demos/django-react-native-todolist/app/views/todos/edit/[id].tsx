import { View, Text, ActivityIndicator } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@powersync/react';
import { LIST_TABLE, ListRecord } from '../../../../library/models/ListModel';
import { ListTodosWidget } from '../../../../library/widgets/ListTodosWidget';

const TodoView = observer(() => {
  const params = useLocalSearchParams<{ id: string }>();

  const id = params.id;
  const { data: result, isLoading } = useQuery<ListRecord>(`SELECT * FROM ${LIST_TABLE} WHERE id = ?`, [id]);
  const listRecord = result[0];

  if (!listRecord && !isLoading) {
    return (
      <View>
        <Text>No matching list found</Text>
      </View>
    );
  }

  if (isLoading) {
    return <ActivityIndicator />;
  }

  return <ListTodosWidget record={listRecord} />;
});

export default TodoView;
