import ChecklistRtlIcon from '@mui/icons-material/ChecklistRtl';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import NorthIcon from '@mui/icons-material/North';
import SignalWifiOffIcon from '@mui/icons-material/SignalWifiOff';
import SouthIcon from '@mui/icons-material/South';
import TerminalIcon from '@mui/icons-material/Terminal';
import WifiIcon from '@mui/icons-material/Wifi';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
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

import { useNavigationPanel } from '@/components/navigation/NavigationPanelContext';
import { usePowerSync } from '@powersync/react';
import { useNavigate } from 'react-router-dom';
import { useAuthActions } from '@convex-dev/auth/react';
import { SQL_CONSOLE_ROUTE, TODO_LISTS_ROUTE, AUTH_ROUTE } from '@/app/router';

export default function ViewsLayout({ children }: { children: React.ReactNode }) {
  const powerSync = usePowerSync();
  const navigate = useNavigate();
  const { signOut } = useAuthActions();

  const [syncStatus, setSyncStatus] = React.useState(powerSync.currentStatus);
  const [openDrawer, setOpenDrawer] = React.useState(false);
  const { title } = useNavigationPanel();

  const handleSignOut = async () => {
    await signOut();
    navigate(AUTH_ROUTE);
  };

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
      }
    ],
    [powerSync]
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
      <S.TopBar position="sticky" elevation={0}>
        <Toolbar sx={{ minHeight: 72 }}>
          <IconButton
            size="large"
            edge="start"
            color="primary"
            aria-label="menu"
            sx={{ mr: 2, bgcolor: 'rgba(37, 99, 235, 0.08)' }}
            onClick={() => setOpenDrawer(!openDrawer)}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">{title}</Typography>
          </Box>
          <Chip
            size="small"
            variant="outlined"
            color={syncStatus?.connected ? 'success' : 'default'}
            icon={syncStatus?.connected ? <WifiIcon /> : <SignalWifiOffIcon />}
            label={syncStatus?.connected ? 'Online' : 'Offline'}
            sx={{ mr: 1.5, fontWeight: 700 }}
          />
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', color: 'text.secondary' }}>
            <NorthIcon
              sx={{ marginRight: '-8px' }}
              color={syncStatus?.dataFlowStatus.uploading ? 'primary' : 'inherit'}
            />
            <SouthIcon color={syncStatus?.dataFlowStatus.downloading ? 'primary' : 'inherit'} />
          </Box>
          <Button color="primary" variant="outlined" onClick={handleSignOut} startIcon={<LogoutIcon />} sx={{ ml: 2 }}>
            Logout
          </Button>
        </Toolbar>
      </S.TopBar>
      <Drawer
        anchor={'left'}
        open={openDrawer}
        onClose={() => setOpenDrawer(false)}
        PaperProps={{
          sx: {
            width: 300,
            borderRight: '1px solid',
            borderColor: 'divider'
          }
        }}
      >
        <Box sx={{ p: 3 }}>
          <S.PowerSyncLogo alt="PowerSync Logo" width={190} height={54} src="/powersync-logo.svg" />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
            <Avatar
              src="/convex-logo.svg"
              alt="Convex"
              sx={{ bgcolor: 'rgba(255, 255, 255, 0.92)', width: 36, height: 36, p: 0.75 }}
            />
            <Box>
              <Typography variant="subtitle2">Convex Todo Demo</Typography>
              <Typography variant="caption" color="text.secondary">
                Local-first sync
              </Typography>
            </Box>
          </Box>
        </Box>
        <Divider />
        <List sx={{ p: 1.5 }}>
          {NAVIGATION_ITEMS.map((item) => (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                sx={{
                  borderRadius: 2,
                  minHeight: 48
                }}
                onClick={async () => {
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
    min-height: 100vh;
  `;

  export const TopBar = styled(AppBar)`
    margin-bottom: 12px;
    background: rgba(17, 24, 39, 0.84);
    color: ${({ theme }) => theme.palette.text.primary};
    border-bottom: 1px solid ${({ theme }) => theme.palette.divider};
    backdrop-filter: blur(16px);
  `;

  export const PowerSyncLogo = styled('img')`
    max-width: 190px;
    max-height: 54px;
    object-fit: contain;
  `;
}
