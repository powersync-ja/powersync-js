import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import { useAuthActions } from '@convex-dev/auth/react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_ENTRY_ROUTE } from '../../router';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

function DemoBrandLogos() {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="center"
      useFlexGap
      sx={{ gap: { xs: 2, md: 2.25, lg: 4.5 }, flexWrap: 'nowrap' }}
    >
      <Box
        component="img"
        src="/powersync-logo.svg"
        alt="PowerSync"
        sx={{
          width: { xs: 138, md: 152, lg: 304 },
          maxWidth: { xs: '42vw', md: '42vw', lg: 'none' },
          height: { xs: 42, md: 46, lg: 92 },
          objectFit: 'contain',
          flexShrink: 0
        }}
      />
      <Box
        component="img"
        src="/convex-logo.svg"
        alt="Convex"
        sx={{
          width: { xs: 118, md: 132, lg: 264 },
          maxWidth: { xs: '36vw', md: '36vw', lg: 'none' },
          height: { xs: 42, md: 46, lg: 92 },
          objectFit: 'contain',
          flexShrink: 0
        }}
      />
    </Stack>
  );
}

function AuthHeroPanel() {
  return (
    <Box
      sx={{
        position: 'relative',
        flex: 1,
        minHeight: { md: '100vh' },
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse 85% 55% at 50% 18%, rgba(56, 189, 248, 0.14) 0%, transparent 58%), linear-gradient(180deg, #0b1224 0%, #111827 38%, #0c1428 72%, #070b14 100%)'
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/tarpit.png)',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center bottom',
          backgroundSize: 'cover',
          opacity: 1,
          pointerEvents: 'none'
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(7, 11, 20, 0.25) 0%, rgba(7, 11, 20, 0.05) 42%, rgba(7, 11, 20, 0.55) 88%, rgba(7, 11, 20, 0.82) 100%)',
          pointerEvents: 'none'
        }}
      />

      <Stack
        sx={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          px: { md: 5, lg: 7 },
          pt: { md: 8, lg: 10 },
          pb: 4,
          justifyContent: 'flex-start',
          alignItems: 'center',
          textAlign: 'center'
        }}
        spacing={4}
      >
        <Box sx={{ maxWidth: 520 }}>
          <Typography
            variant="h3"
            component="h2"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              mb: 2,
              color: '#f8fafc',
              fontSize: { md: '2.05rem', lg: '2.35rem' }
            }}
          >
            Escape the network tarpit
          </Typography>
          <Stack spacing={1.25} sx={{ color: 'rgba(226, 232, 240, 0.88)', fontSize: '1.05rem', lineHeight: 1.6, fontWeight: 400 }}>
            <Typography sx={{ color: 'inherit', fontSize: 'inherit', lineHeight: 'inherit', fontWeight: 'inherit' }}>
              Automatically sync your backend database with in-app SQLite.
            </Typography>
            <Typography sx={{ color: 'inherit', fontSize: 'inherit', lineHeight: 'inherit', fontWeight: 'inherit' }}>
              Avoid the complexities of using APIs to move app state over the network.
            </Typography>
          </Stack>
        </Box>

        <Stack
          alignItems="center"
          spacing={2}
          sx={{
            width: '100%',
            maxWidth: { md: 728, lg: 806 },
            mt: { md: 1, lg: 2 }
          }}
        >
          <Box sx={{ display: { xs: 'none', md: 'block' }, width: '100%' }}>
            <DemoBrandLogos />
          </Box>
          <Box
            component="img"
            src="/dataflow.png"
            alt="Convex to PowerSync to SQLite data flow"
            sx={{
              width: '100%',
              height: 'auto',
              display: 'block',
              px: { md: 0.5, lg: 1 },
              objectFit: 'contain',
              borderRadius: '20px'
            }}
          />
        </Stack>
      </Stack>
    </Box>
  );
}

export function LoginPage() {
  const [tab, setTab] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuthActions();
  const navigate = useNavigate();

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
    setError(null);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await signIn('password', { email, password, flow: 'signIn' });
      navigate(DEFAULT_ENTRY_ROUTE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await signIn('password', { email, password, flow: 'signUp' });
      navigate(DEFAULT_ENTRY_ROUTE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
      setIsLoading(false);
    }
  };

  const authCard = (
    <Card
      sx={{
        width: '100%',
        maxWidth: { xs: 'none', md: 'none' },
        borderRadius: { xs: 0, md: 0 },
        overflow: 'hidden',
        mx: { xs: 0, md: 0 },
        flex: { xs: 1, md: 1 },
        alignSelf: { xs: 'stretch', md: 'stretch' },
        minHeight: { xs: '100dvh', md: '100vh' },
        display: 'flex',
        flexDirection: 'column',
        boxShadow: { xs: 'none', md: 'none' },
        border: { md: 'none' },
        borderRight: { md: '1px solid' },
        borderColor: { md: 'divider' }
      }}
    >
      <CardContent
        sx={{
          flex: { xs: 1, md: 1 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: { xs: 'flex-start', md: 'center' },
          boxSizing: 'border-box',
          width: '100%',
          pt: {
            xs: 'max(16px, env(safe-area-inset-top, 0px))',
            sm: 4,
            md: 5,
            lg: 6
          },
          pr: {
            xs: 'max(16px, env(safe-area-inset-right, 0px))',
            sm: 4,
            md: 5,
            lg: 6
          },
          pb: {
            xs: 'max(16px, env(safe-area-inset-bottom, 0px))',
            sm: 4,
            md: 5,
            lg: 6
          },
          pl: {
            xs: 'max(16px, env(safe-area-inset-left, 0px))',
            sm: 4,
            md: 5,
            lg: 6
          }
        }}
      >
        <Stack alignItems="center" spacing={2.5} sx={{ mb: 3 }}>
          <Box sx={{ display: { xs: 'block', md: 'none' }, width: '100%' }}>
            <DemoBrandLogos />
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" component="h1" sx={{ mb: 0.75 }}>
              Local-first todos
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 340 }}>
              Sign in to sync tasks through PowerSync with Convex auth and mutations.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" justifyContent="center">
            <Chip size="small" label="SQLite sync" color="primary" variant="outlined" />
            <Chip size="small" label="Convex Auth" color="secondary" variant="outlined" />
          </Stack>
        </Stack>

        <Tabs
          value={tab}
          onChange={handleTabChange}
          variant="fullWidth"
          textColor="primary"
          indicatorColor="primary"
          sx={{
            minHeight: 48,
            mb: 1,
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 48,
              py: 1,
              fontWeight: 700,
              fontSize: '0.9375rem',
              textTransform: 'none'
            }
          }}
        >
          <Tab label="Sign in" id="auth-tab-0" aria-controls="auth-tabpanel-0" />
          <Tab label="Sign up" id="auth-tab-1" aria-controls="auth-tabpanel-1" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
            {error}
          </Alert>
        )}

        <TabPanel value={tab} index={0}>
          <Box component="form" onSubmit={handleSignIn}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              disabled={isLoading}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              disabled={isLoading}
            />
            <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 2.5 }} disabled={isLoading}>
              {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
          </Box>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Box component="form" onSubmit={handleSignUp}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              disabled={isLoading}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              disabled={isLoading}
              helperText="Password must be at least 8 characters"
            />
            <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 2.5 }} disabled={isLoading}>
              {isLoading ? <CircularProgress size={24} /> : 'Sign Up'}
            </Button>
          </Box>
        </TabPanel>
      </CardContent>
    </Card>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        minHeight: { xs: '100dvh', md: '100vh' },
        width: '100%'
      }}
    >
      <Box
        sx={{
          flex: { xs: 1, md: '0 0 auto' },
          width: '100%',
          maxWidth: { xs: 'none', md: 380, lg: 400 },
          display: 'flex',
          alignItems: { xs: 'stretch', md: 'stretch' },
          justifyContent: { xs: 'stretch', md: 'stretch' },
          alignSelf: { md: 'stretch' },
          minHeight: { xs: '100dvh', md: '100vh' },
          px: { xs: 0, md: 0 },
          py: { xs: 0, md: 0 },
          background: {
            xs: 'linear-gradient(140deg, rgba(125, 211, 252, 0.16) 0%, rgba(167, 139, 250, 0.11) 42%, rgba(52, 211, 153, 0.12) 100%)',
            md: 'linear-gradient(115deg, rgba(125, 211, 252, 0.12) 0%, rgba(167, 139, 250, 0.08) 48%, rgba(15, 23, 42, 0.65) 100%)'
          }
        }}
      >
        {authCard}
      </Box>

      <AuthHeroPanel />
    </Box>
  );
}
