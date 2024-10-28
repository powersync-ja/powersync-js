import * as React from 'react';
import { FlatList, View, StyleSheet, ScrollView } from 'react-native';

import { usePowerSync, useQuery } from '@powersync/react';
import { Button, Text } from '@rneui/themed';
import { BenchmarkItem, itemLatency } from '../library/powersync/AppSchema';
import { useSystem } from '../library/powersync/system';
import { BenchmarkItemWidget } from '../library/widgets/BenchmarkItemWidget';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { HeaderWidget } from '../library/widgets/HeaderWidget';

let itemIndex = 1;

const App: React.FC = () => {
  const system = useSystem();
  const db = usePowerSync();

  React.useEffect(() => {
    system.init();
  }, []);

  const { data: benchmarkItems } = useQuery<BenchmarkItem>(
    `select max(description) as description, * from benchmark_items
      group by client_created_at
      order by client_created_at desc
      `
  );

  const {
    data: [countRow]
  } = useQuery<{ count: number }>('select count() as count from ps_oplog');

  const count = countRow?.count ?? 0;
  const syncDuration = system.syncTime;

  const latencies = benchmarkItems.map(itemLatency).filter((e) => e !== null);
  const totalLatency = latencies.reduce((a, b) => a + b, 0);
  const averageLatency = latencies.length > 0 ? totalLatency / latencies.length : 0;
  const latencyString = averageLatency.toFixed(1);

  const clearAll = async () => {
    await db.execute('DELETE FROM benchmark_items');
  };

  const resync = async () => {
    await system.resync();
  };

  const createBatch = async (n: number) => {
    let items = [];
    for (let i = 1; i <= n; i++) {
      items.push(`Batch Test ${itemIndex}/${i}`);
    }
    itemIndex += 1;
    const results = await db.execute(
      `
      INSERT INTO
        benchmark_items(id, description, client_created_at)
      SELECT uuid(), e.value, ?
      FROM json_each(?) e
      RETURNING *
    `,
      [new Date().toISOString(), JSON.stringify(items)]
    );
  };

  const renderItem = ({ item }: { item: BenchmarkItem }) => <BenchmarkItemWidget item={item} />;

  const statusText = `First sync duration: ${syncDuration}ms / ${count ?? 0} operations / ${latencyString}ms latency`;
  return (
    <View style={styles.container}>
      <HeaderWidget title="Sync Benchmarks" />
      <View style={styles.body}>
        <View style={styles.row}>
          <Text>{statusText}</Text>
        </View>
        <View style={styles.row}>
          <Button onPress={() => createBatch(1)} radius="sm">
            +1
          </Button>
          <Button onPress={() => createBatch(100)} radius="sm">
            +100
          </Button>
          <Button onPress={() => createBatch(1000)} radius="sm">
            +1000
          </Button>
        </View>
        <View style={styles.row}>
          <Button onPress={resync}>
            <MaterialIcon name="sync" color="white" size={18} />
            Resync
          </Button>
          <Button title="Delete all" onPress={clearAll}>
            <MaterialIcon name="delete" color="white" size={18} />
            Delete all
          </Button>
        </View>

        <FlatList data={benchmarkItems} renderItem={renderItem} keyExtractor={(item) => item.id} />
      </View>
    </View>
  );
};

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  body: {
    padding: 20,
    backgroundColor: '#f0f0f0'
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
    gap: 8
  }
});
