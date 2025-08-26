import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Avatar,
  Button,
  ButtonGroup,
  Checkbox,
  Divider,
  FormControlLabel,
  FormGroup,
  Grid,
  IconButton,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  styled,
  Typography
} from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import { LOG_STORAGE, LogRecord } from '../components/providers/Logging.js';

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

async function shareFile(content: string) {
  await Share.share({
    title: 'logs',
    text: content,
    dialogTitle: 'Share your log file'
  });
}

export const LogDisplay: React.FC<{ logs: ReadonlyArray<Readonly<LogRecord>> }> = React.memo((props) => {
  const { logs } = props;

  const Row = ({ index, style }: ListChildComponentProps) => {
    const log = logs[index];
    return (
      <div style={style} key={index}>
        <ListItem alignItems="flex-start" disableGutters>
          <ListItemAvatar>
            <Avatar
              sx={{
                bgcolor: log.level === 'ERROR' ? '#d32f2f' : log.level === 'WARN' ? '#fbc02d' : '#1976d2',
                width: 32,
                height: 32,
                fontSize: 16
              }}>
              {log.level[0].toUpperCase()}
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <>
                <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                  {log.timestamp}
                </Typography>
                <Typography variant="overline" color="text.primary" sx={{ fontWeight: 700, ml: 1 }}>
                  {log.level.toUpperCase()}
                </Typography>
              </>
            }
            secondary={
              <Typography
                component="pre"
                variant="body2"
                color="text.primary"
                sx={{
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all', // or 'break-word'
                  m: 0,
                  maxWidth: '100%',
                  fontSize: '10px',
                  maxHeight: '70px',
                  overflow: 'scroll',
                  display: 'block'
                }}>
                {log.message.slice(0, 100)}
                {log.message.length > 100 ? '...' : ''}
              </Typography>
            }
          />
        </ListItem>
        {index < logs.length - 1 && <Divider variant="inset" component="div" />}
      </div>
    );
  };

  return (
    <Paper sx={{ width: '100%' }} elevation={1}>
      <S.LogsListContainer>
        {logs.length === 0 ? (
          <Typography sx={{ color: '#888', textAlign: 'center', mt: 2 }}>No logs</Typography>
        ) : (
          <FixedSizeList height={1000} width="100%" itemSize={100} itemCount={logs.length}>
            {Row}
          </FixedSizeList>
        )}
      </S.LogsListContainer>
    </Paper>
  );
});

const LOG_LEVELS = [
  { label: 'Error', value: 'ERROR', color: '#d32f2f' },
  { label: 'Warn', value: 'WARN', color: '#fbc02d' },
  { label: 'Debug', value: 'DEBUG', color: '#1976d2' },
  { label: 'Info', value: 'INFO', color: '#1976d2' }
];

const LogsPage = () => {
  const [logs, setLogs] = React.useState(LOG_STORAGE.logs);
  const [selectedLevels, setSelectedLevels] = React.useState<string[]>(LOG_LEVELS.map((l) => l.value));
  const navigate = useNavigate();

  React.useEffect(() => {
    return LOG_STORAGE.registerListener({
      logsUpdated: (logs) => setLogs([...logs])
    });
  }, []);

  const handleLevelChange = (level: string) => {
    setSelectedLevels((prev) => (prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]));
  };

  const filteredLogs = logs.filter((log) => selectedLevels.includes(log.level));

  return (
    <S.MainGrid container>
      <Grid xs={12} display="flex" alignItems="center" mb={2} marginTop="30px">
        <IconButton color="primary" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowBackIcon />
        </IconButton>
        <Typography width="100%" variant="h4" textAlign={'center'}>
          Logs
        </Typography>
      </Grid>
      <Grid xs={6}>
        <FormGroup row sx={{ ml: 2 }}>
          {LOG_LEVELS.map(({ label, value, color }) => (
            <FormControlLabel
              key={value}
              control={
                <Checkbox
                  checked={selectedLevels.includes(value)}
                  onChange={() => handleLevelChange(value)}
                  sx={{ color, '&.Mui-checked': { color } }}
                />
              }
              label={label}
            />
          ))}
        </FormGroup>
      </Grid>
      <Grid xs={6} display="flex" justifyContent="flex-end">
        <ButtonGroup>
          <Button variant="contained" color="secondary" onClick={() => LOG_STORAGE.clearLogs()}>
            Clear Logs
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={async () => {
              const filename = `logs-${new Date().toISOString()}.json`;
              const content = JSON.stringify(logs);
              const platform = Capacitor.getPlatform();
              if (platform == 'web') {
                downloadTextFile(filename, content);
              } else {
                await shareFile(content);
              }
            }}>
            Download
          </Button>
        </ButtonGroup>
      </Grid>
      <Grid xs={12}>
        <LogDisplay logs={filteredLogs} />
      </Grid>
    </S.MainGrid>
  );
};

namespace S {
  export const MainGrid = styled(Grid)`
    width: 100vw;
  `;

  export const LogsListContainer = styled('div')`
    width: 100%;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.07);
    overflow-x: auto;
    overflow-y: auto;
    max-height: 1000px;
    padding: 0.5rem 0;
  `;
}

export default LogsPage;
