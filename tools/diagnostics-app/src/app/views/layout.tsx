import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import MenuIcon from '@mui/icons-material/Menu';
import NorthIcon from '@mui/icons-material/North';
import SignalWifiOffIcon from '@mui/icons-material/SignalWifiOff';
import SouthIcon from '@mui/icons-material/South';
import StorageIcon from '@mui/icons-material/Storage';
import TableChartIcon from '@mui/icons-material/TableChart';
import TerminalIcon from '@mui/icons-material/Terminal';
import WifiIcon from '@mui/icons-material/Wifi';
import UserIcon from '@mui/icons-material/VerifiedUser';

import {
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
  Toolbar,
  Typography,
  styled
} from '@mui/material';
import React from 'react';

import {
  CLIENT_PARAMETERS_ROUTE,
  LOGIN_ROUTE,
  SCHEMA_ROUTE,
  SQL_CONSOLE_ROUTE,
  SYNC_DIAGNOSTICS_ROUTE
} from '@/app/router';
import { useNavigationPanel } from '@/components/navigation/NavigationPanelContext';
import { signOut, sync, syncErrorTracker } from '@/library/powersync/ConnectionManager';
import { usePowerSync } from '@powersync/react';
import { useNavigate } from 'react-router-dom';

export default function ViewsLayout({ children }: { children: React.ReactNode }) {
  const powerSync = usePowerSync();
  const navigate = useNavigate();

  const [syncStatus, setSyncStatus] = React.useState(sync.syncStatus);
  const [syncError, setSyncError] = React.useState<Error | null>(null);
  const { title } = useNavigationPanel();

  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);

  const handleDrawerClose = () => {
    setIsClosing(true);
    setMobileOpen(false);
  };

  const handleDrawerTransitionEnd = () => {
    setIsClosing(false);
  };

  const handleDrawerToggle = () => {
    if (!isClosing) {
      setMobileOpen(!mobileOpen);
    }
  };

  const NAVIGATION_ITEMS = React.useMemo(
    () => [
      {
        path: SYNC_DIAGNOSTICS_ROUTE,
        title: 'Sync Overview',
        icon: () => <TableChartIcon />
      },
      {
        path: SCHEMA_ROUTE,
        title: 'Dynamic Schema',
        icon: () => <StorageIcon />
      },
      {
        path: SQL_CONSOLE_ROUTE,
        title: 'SQL Console',
        icon: () => <TerminalIcon />
      },
      {
        path: CLIENT_PARAMETERS_ROUTE,
        title: 'Client Parameters',
        icon: () => <UserIcon />
      },
      {
        path: LOGIN_ROUTE,
        title: 'Sign Out',
        beforeNavigate: async () => {
          await signOut();
        },
        icon: () => <ExitToAppIcon />
      }
    ],
    [powerSync]
  );

  // Cannot use `useStatus()`, since we're not using the default sync implementation.
  React.useEffect(() => {
    const l = sync.registerListener({
      statusChanged: (status) => {
        setSyncStatus(status);
      }
    });
    return () => l();
  }, []);

  React.useEffect(() => {
    const l = syncErrorTracker.registerListener({
      lastErrorUpdated(error) {
        setSyncError(error);
      }
    });
    return () => l();
  }, []);
  const drawerWidth = 320;

  const drawer = (
    <>
      <S.PowerSyncLogo alt="PowerSync Logo" width={250} height={100} src="/powersync-logo.svg" />
      <Divider />
      <List>
        {NAVIGATION_ITEMS.map((item) => (
          <ListItem key={item.path}>
            <ListItemButton
              onClick={async () => {
                await item.beforeNavigate?.();
                navigate(item.path);
                setMobileOpen(false);
              }}>
              <ListItemIcon>{item.icon()}</ListItemIcon>
              <ListItemText primary={item.title} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </>
  );

  return (
    <S.MainBox sx={{ display: 'flex' }}>
      <S.TopBar
        position="absolute"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` }
        }}>
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2, display: { md: 'none' } }}
            onClick={handleDrawerToggle}>
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography>{title}</Typography>
          </Box>
          <NorthIcon
            sx={{ marginRight: '-10px' }}
            color={syncStatus?.dataFlowStatus.uploading ? 'primary' : 'inherit'}
          />
          <SouthIcon color={syncStatus?.dataFlowStatus.downloading ? 'primary' : 'inherit'} />
          {syncStatus?.connected ? (
            <WifiIcon />
          ) : (
            <SignalWifiOffIcon titleAccess={syncError?.message ?? 'Not connected'} />
          )}
        </Toolbar>
      </S.TopBar>
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onTransitionEnd={handleDrawerTransitionEnd}
          onClose={handleDrawerClose}
          ModalProps={{
            keepMounted: true // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
          }}>
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
          }}
          open>
          {drawer}
        </Drawer>
      </Box>
      <S.MainBox sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` }, marginTop: '50px' }}>
        {children}
      </S.MainBox>
    </S.MainBox>
  );
}

namespace S {
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