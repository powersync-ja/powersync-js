'use client';

import {
  Box,
  Chip,
  Divider,
  Paper,
  Typography,
  styled
} from '@mui/material';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { useStatus } from '@powersync/react';

function StatusItem({
  label,
  value,
  ok,
  icon
}: {
  label: string;
  value: string;
  ok: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Box display="flex" alignItems="center" gap={0.5}>
        {icon}
        <Typography variant="body2" fontWeight={500} color={ok ? 'text.primary' : 'text.secondary'}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

export function StatusPanel() {
  const status = useStatus();
  const { connected, hasSynced, dataFlowStatus } = status;
  const { uploading, downloading, uploadError, downloadError } = dataFlowStatus;

  let icon = <CloudOffIcon />;
  let label = 'Disconnected';
  let chipColor: 'default' | 'success' | 'warning' | 'error' = 'default';

  if (uploadError || downloadError) {
    icon = <ErrorOutlineIcon />;
    label = 'Error';
    chipColor = 'error';
  } else if (connected && hasSynced) {
    icon = <CloudDoneIcon />;
    label = 'Synced';
    chipColor = 'success';
  } else if (connected) {
    icon = <CloudSyncIcon />;
    label = 'Syncing';
    chipColor = 'warning';
  }

  return (
    <StatusCard elevation={0}>
      <StatusRow>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
          Sync Status
        </Typography>
        <Chip icon={icon} label={label} color={chipColor} size="small" variant="filled" />
      </StatusRow>

      <Divider sx={{ my: 1 }} />

      <StatusGrid>
        <StatusItem label="Connected" value={connected ? 'Yes' : 'No'} ok={!!connected} />
        <StatusItem label="Initial sync" value={hasSynced ? 'Done' : 'Pending'} ok={!!hasSynced} />
        <StatusItem
          label="Upload"
          value={uploadError ? 'Error' : uploading ? 'Active' : 'Idle'}
          ok={!uploadError}
          icon={uploading ? <ArrowUpwardIcon sx={{ fontSize: 13 }} /> : undefined}
        />
        <StatusItem
          label="Download"
          value={downloadError ? 'Error' : downloading ? 'Active' : 'Idle'}
          ok={!downloadError}
          icon={downloading ? <ArrowDownwardIcon sx={{ fontSize: 13 }} /> : undefined}
        />
      </StatusGrid>

      {(uploadError || downloadError) && (
        <Box mt={1}>
          {uploadError && (
            <Typography variant="caption" color="error" display="block">
              Upload: {String(uploadError)}
            </Typography>
          )}
          {downloadError && (
            <Typography variant="caption" color="error" display="block">
              Download: {String(downloadError)}
            </Typography>
          )}
        </Box>
      )}
    </StatusCard>
  );
}

const StatusCard = styled(Paper)`
  background: #161616;
  border: 1px solid #282828;
  border-radius: 12px;
  padding: 16px 20px;
`;

const StatusRow = styled('div')`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const StatusGrid = styled('div')`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 8px;
  padding-top: 8px;
`;
