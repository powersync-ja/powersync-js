import React from 'react';
import { Card, Icon, Text } from '@rneui/themed';
import { BenchmarkItem, itemLatency, uploadLatency } from '../powersync/AppSchema';

function getSubtitle(item: BenchmarkItem) {
  if (item.client_received_at == null || item.server_created_at == null) {
    return 'Syncing...';
  }
  return `Sync latency: ${itemLatency(item)?.toFixed(1)}ms / upload: ${uploadLatency(item)?.toFixed(1)}ms`;
}
export const BenchmarkItemWidget = ({ item }: { item: BenchmarkItem }) => {
  const subtitle = getSubtitle(item);

  return (
    <Card>
      <Text>
        {item.description}: {subtitle}
      </Text>
    </Card>
  );
};
