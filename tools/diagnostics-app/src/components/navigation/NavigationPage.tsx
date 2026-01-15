import React from 'react';
import { useNavigationPanel } from './NavigationPanelContext';

/**
 * Wraps a component with automatic navigation panel title management
 */
export const NavigationPage: React.FC<React.PropsWithChildren<{ title: string }>> = ({ title, children }) => {
  const navigationPanel = useNavigationPanel();

  React.useEffect(() => {
    navigationPanel.setTitle(title);

    return () => navigationPanel.setTitle('');
  }, [title, navigationPanel]);

  return <>{children}</>;
};
