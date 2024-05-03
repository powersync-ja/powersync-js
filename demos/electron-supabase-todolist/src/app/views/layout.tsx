import {
  ChecklistRtl,
  ExitToApp,
  Menu,
  North,
  SignalWifiOff,
  South,
  Terminal,
  Wifi,
  ArrowBack
} from '@mui/icons-material';
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

import { useNavigationPanel } from '../../components/navigation/NavigationPanelContext.jsx';
import { useSupabase } from '../../components/providers/SystemProvider.jsx';
import { usePowerSync, useStatus } from '@powersync/react';
import { useNavigate } from 'react-router-dom';
import { LOGIN_ROUTE, SQL_CONSOLE_ROUTE, TODO_LISTS_ROUTE } from '../../app/router.jsx';

export default function ViewsLayout({ children }: { children: React.ReactNode }) {
  const powerSync = usePowerSync();
  const status = useStatus();
  const supabase = useSupabase();
  const navigate = useNavigate();

  const [openDrawer, setOpenDrawer] = React.useState(false);
  const { title } = useNavigationPanel();

  const NAVIGATION_ITEMS = React.useMemo(
    () => [
      {
        path: TODO_LISTS_ROUTE,
        title: 'TODO Lists',
        icon: () => <ChecklistRtl />
      },
      {
        path: SQL_CONSOLE_ROUTE,
        title: 'SQL Console',
        icon: () => <Terminal />
      },
      {
        path: LOGIN_ROUTE,
        title: 'Sign Out',
        beforeNavigate: async () => {
          await powerSync.disconnectAndClear();
          await supabase?.client.auth.signOut();
        },
        icon: () => <ExitToApp />
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
            onClick={() => navigate(-1)}
          >
            <ArrowBack />
          </IconButton>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={() => setOpenDrawer(!openDrawer)}
          >
            <Menu />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography>{title}</Typography>
          </Box>
          <North sx={{ marginRight: '-10px' }} color={status?.dataFlowStatus.uploading ? 'primary' : 'inherit'} />
          <South color={status?.dataFlowStatus.downloading ? 'primary' : 'inherit'} />
          {status?.connected ? <Wifi /> : <SignalWifiOff />}
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
                }}
              >
                <ListItemIcon>{item.icon()}</ListItemIcon>
                <ListItemText primary={item.title} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
      <S.MainBox>{children}</S.MainBox>
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
