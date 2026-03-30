'use client';

import { CustomerList } from '@/components/CustomerList';
import { StatusPanel } from '@/components/StatusPanel';
import { Box, CircularProgress, Typography, styled } from '@mui/material';
import { useStatus } from '@powersync/react';
import Image from 'next/image';

export default function HomePage() {
  const status = useStatus();

  if (!status.hasSynced) {
    return (
      <Fullscreen>
        <Image src="/powersync-logo.svg" alt="PowerSync" width={220} height={34} priority />
        <CircularProgress size={32} sx={{ mt: 4, color: '#00d5ff' }} />
        <Typography variant="body2" color="text.secondary" mt={2}>
          Connecting…
        </Typography>
      </Fullscreen>
    );
  }

  return (
    <Root>
      <Container>
        <Box mb={4}>
          <Image src="/powersync-logo.svg" alt="PowerSync" width={200} height={31} priority />
        </Box>
        <StatusPanel />
        <CustomerList />
      </Container>
    </Root>
  );
}

const Root = styled('div')`
  min-height: 100vh;
  background: #0a0a0a;
  display: flex;
  justify-content: center;
  padding: 48px 16px;
`;

const Container = styled('div')`
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
`;

const Fullscreen = styled('div')`
  min-height: 100vh;
  background: #0a0a0a;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;
