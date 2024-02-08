'use client';
import React from 'react';
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
import Image from 'next/image';
import MenuIcon from '@mui/icons-material/Menu';
import WifiIcon from '@mui/icons-material/Wifi';
import SignalWifiOffIcon from '@mui/icons-material/SignalWifiOff';
import ChecklistRtlIcon from '@mui/icons-material/ChecklistRtl';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import TerminalIcon from '@mui/icons-material/Terminal';
import NorthIcon from '@mui/icons-material/North';
import SouthIcon from '@mui/icons-material/South';

import { usePowerSync } from '@journeyapps/powersync-react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/providers/SystemProvider';
import { NavigationPanelContext } from '@/components/navigation/NavigationPanelContext';

export default function ViewsLayout({ children }: { children: React.ReactNode }) {
  const powerSync = usePowerSync();
  const router = useRouter();
  const supabase = useSupabase();

  const [syncStatus, setSyncStatus] = React.useState(powerSync.currentStatus);
  const [openDrawer, setOpenDrawer] = React.useState(false);
  const [title, setTitle] = React.useState('');

  const NAVIGATION_ITEMS = React.useMemo(
    () => [
      {
        path: '/views/sql-console',
        title: 'SQL Console',
        icon: () => <TerminalIcon />
      },
      {
        path: '/views/todo-lists',
        title: 'TODO Lists',
        icon: () => <ChecklistRtlIcon />
      },
      {
        path: '/auth/login',
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

  React.useEffect(() => {
    const l = powerSync.registerListener({
      statusChanged: (status) => {
        setSyncStatus(status);
      }
    });
    return () => l?.();
  }, [powerSync]);

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
            onClick={() => setOpenDrawer(!openDrawer)}
          >
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
          {syncStatus?.connected ? <WifiIcon /> : <SignalWifiOffIcon />}
        </Toolbar>
      </S.TopBar>
      <Drawer anchor={'left'} open={openDrawer} onClose={() => setOpenDrawer(false)}>
        <S.PowerSyncLogo alt="PowerSync Logo" priority width={250} height={100} src="/powersync-logo.svg" />
        <Divider />
        <List>
          {NAVIGATION_ITEMS.map((item) => (
            <ListItem key={item.path}>
              <ListItemButton
                onClick={async () => {
                  await item.beforeNavigate?.();
                  router.push(item.path);
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
      <S.MainBox>
        <NavigationPanelContext.Provider value={{ setTitle }}>{children}</NavigationPanelContext.Provider>
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

  export const PowerSyncLogo = styled(Image)`
    object-fit: contain;
    padding: 20px;
  `;
}
