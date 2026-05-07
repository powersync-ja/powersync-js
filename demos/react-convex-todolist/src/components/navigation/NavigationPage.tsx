import React from 'react';
import { useNavigationPanel } from './NavigationPanelContext';
import { Box, styled } from '@mui/material';

/**
 * Wraps a component with automatic navigation panel title management
 */
export const NavigationPage: React.FC<React.PropsWithChildren<{ title: string }>> = ({ title, children }) => {
  const navigationPanel = useNavigationPanel();

  React.useEffect(() => {
    navigationPanel.setTitle(title);

    return () => navigationPanel.setTitle('');
  }, [title, navigationPanel]);

  return <S.Container>{children}</S.Container>;
};

namespace S {
  export const Container = styled(Box)`
    width: min(1120px, calc(100% - 32px));
    margin: 0 auto;
    padding: 16px 0 32px;
  `;
}
