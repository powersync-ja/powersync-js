import { LOGIN_ROUTE, SQL_CONSOLE_ROUTE, TODO_LISTS_ROUTE } from '@/app/router';
import { useNavigationPanel } from '@/components/navigation/NavigationPanelContext';
import { syncOptions, useCheckpointRequests, useSupabase } from '@/components/providers/SystemProvider';
import ChecklistRtlIcon from '@mui/icons-material/ChecklistRtl';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import MenuIcon from '@mui/icons-material/Menu';
import NorthIcon from '@mui/icons-material/North';
import RefreshIconBase from '@mui/icons-material/Refresh';
import SignalWifiOffIcon from '@mui/icons-material/SignalWifiOff';
import SouthIcon from '@mui/icons-material/South';
import TerminalIcon from '@mui/icons-material/Terminal';
import WifiIcon from '@mui/icons-material/Wifi';
import { css, keyframes } from '@emotion/react';
import {
  Alert,
  AlertColor,
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Snackbar,
  Toolbar,
  Tooltip,
  Typography,
  styled
} from '@mui/material';
import { usePowerSync, useStatus } from '@powersync/react';
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAbortSignal } from '../utils/helpers';

export default function ViewsLayout({ children }: { children: React.ReactNode }) {
  const powerSync = usePowerSync();
  const status = useStatus();
  const supabase = useSupabase();
  const navigate = useNavigate();

  const [openDrawer, setOpenDrawer] = React.useState(false);
  const { title } = useNavigationPanel();

  const [connectionAnchor, setConnectionAnchor] = React.useState<null | HTMLElement>(null);
  const [explicitRefresh, setExplicitRefresh] = React.useState<'working' | 'success' | 'error' | null>(null);
  const snackbarStatus = useMemo<{ severity: AlertColor; message: string } | undefined>(() => {
    if (explicitRefresh == 'success') {
      return { severity: 'success', message: 'Synced successfully!' };
    } else if (explicitRefresh == 'error') {
      return { severity: 'error', message: 'Sync checkpoint failed' };
    }
  }, [explicitRefresh]);
  const abortSignal = useAbortSignal();

  async function explicitSync() {
    setExplicitRefresh('working');

    try {
      const checkpoint = await powerSync.requestCheckpoint();
      await checkpoint.waitForSync({ signal: abortSignal });
      setExplicitRefresh('success');
    } catch (e) {
      console.log('Error in explicit sync request', e);
      setExplicitRefresh('error');
    }
  }

  const NAVIGATION_ITEMS = React.useMemo(
    () => [
      {
        path: SQL_CONSOLE_ROUTE,
        title: 'SQL Console',
        icon: () => <TerminalIcon />
      },
      {
        path: TODO_LISTS_ROUTE,
        title: 'TODO Lists',
        icon: () => <ChecklistRtlIcon />
      },
      {
        path: LOGIN_ROUTE,
        title: 'Sign Out',
        beforeNavigate: async () => {
          await powerSync.disconnectAndClear();
          await supabase?.client.auth.signOut();
        },
        icon: () => <ExitToAppIcon />
      }
    ],
    [powerSync, supabase]
  );

  return (
    <S.MainBox>
      <S.TopBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={() => setOpenDrawer(!openDrawer)}>
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography>{title}</Typography>
          </Box>
          {status?.connected && useCheckpointRequests === 'true' && (
            <Tooltip title="Request explicit sync">
              <IconButton size="small" color="inherit" aria-label="refresh" onClick={explicitSync}>
                <S.RefreshIcon spinning={explicitRefresh == 'working'} />
              </IconButton>
            </Tooltip>
          )}
          <NorthIcon sx={{ marginRight: '-10px' }} color={status?.uploading ? 'primary' : 'inherit'} />
          <SouthIcon color={status?.downloading ? 'primary' : 'inherit'} />
          <Box
            sx={{ cursor: 'pointer' }}
            onClick={(event) => {
              setConnectionAnchor(event.currentTarget);
            }}>
            {status?.connected ? <WifiIcon /> : <SignalWifiOffIcon />}
          </Box>
          {/* Allows for manual connection and disconnect for testing purposes */}
          <Menu
            id="connection-menu"
            anchorEl={connectionAnchor}
            open={Boolean(connectionAnchor)}
            onClose={() => setConnectionAnchor(null)}>
            {status?.connected || status?.connecting ? (
              <MenuItem
                onClick={(event) => {
                  setConnectionAnchor(null);
                  powerSync.disconnect();
                }}>
                Disconnect
              </MenuItem>
            ) : supabase ? (
              <MenuItem
                onClick={(event) => {
                  setConnectionAnchor(null);
                  powerSync.connect(supabase, syncOptions);
                }}>
                Connect
              </MenuItem>
            ) : null}
          </Menu>
        </Toolbar>
      </S.TopBar>
      <Drawer anchor={'left'} open={openDrawer} onClose={() => setOpenDrawer(false)}>
        <S.PowerSyncLogo alt="PowerSync Logo" width={250} height={100} src="/powersync-logo.svg" />
        <Divider />
        <List>
          {NAVIGATION_ITEMS.map((item) => (
            <ListItem key={item.path}>
              <ListItemButton
                onClick={async () => {
                  await item.beforeNavigate?.();
                  navigate(item.path);
                  setOpenDrawer(false);
                }}>
                <ListItemIcon>{item.icon()}</ListItemIcon>
                <ListItemText primary={item.title} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
      <S.MainBox>{children}</S.MainBox>
      <Snackbar
        open={snackbarStatus != null}
        autoHideDuration={4000}
        onClose={() => setExplicitRefresh(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setExplicitRefresh(null)} severity={snackbarStatus?.severity} sx={{ width: '100%' }}>
          {snackbarStatus?.message}
        </Alert>
      </Snackbar>
    </S.MainBox>
  );
}

namespace S {
  const spin = keyframes`
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  `;

  export const RefreshIcon = styled(RefreshIconBase, {
    shouldForwardProp: (prop: string) => prop !== 'spinning'
  })<{ spinning: boolean }>`
    animation: ${(props: { spinning: boolean }) => (props.spinning ? css`${spin} 1s linear infinite` : 'none')};
  `;

  export const MainBox = styled(Box)`
    flex-grow: 1;
  `;

  export const TopBar = styled(AppBar)`
    margin-bottom: 20px;
  `;

  export const PowerSyncLogo = styled('img')`
    max-width: 250px;
    max-height: 250px;
    object-fit: contain;
    padding: 20px;
  `;
}
