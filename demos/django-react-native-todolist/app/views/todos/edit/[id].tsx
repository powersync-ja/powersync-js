import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@powersync/react';
import { ListTodosWidget } from '../../../../library/widgets/ListTodosWidget';
import { LIST_TABLE, ListRecord } from '../../../../library/powersync/AppSchema';

const TodoView = () => {
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
};

export default TodoView;
