import { SyncStatus } from '@powersync/common';
import { useStatus } from '@powersync/react';
import { Header, Icon } from '@rneui/themed';
import React from 'react';
import { Text } from 'react-native';

export const HeaderWidget: React.FC<{
  title?: string;
}> = (props) => {
  const status = useStatus();

  const { title } = props;
  return (
    <Header
      rightComponent={
        <Icon name={getIcon(status)} type="material-community" color="white" size={20} style={{ padding: 5 }} />
      }
      centerComponent={<Text style={{ padding: 5, color: '#fff' }}>{title}</Text>}
    />
  );
};

function getIcon(status: SyncStatus) {
  if (!status.connected) {
    return 'wifi-off';
  } else if (status.dataFlowStatus.uploading) {
    return 'cloud-sync';
  } else if (status.dataFlowStatus.downloading) {
    return 'cloud-sync';
  } else {
    return 'wifi';
  }
}
