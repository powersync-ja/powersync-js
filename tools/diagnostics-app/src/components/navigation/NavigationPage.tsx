import React from 'react';
import { useNavigationPanel } from './NavigationPanelContext';
import { cn } from '@/lib/utils';

/**
 * Wraps a component with automatic navigation panel title management
 */
export const NavigationPage: React.FC<React.PropsWithChildren<{ title: string }>> = ({ title, children }) => {
  const navigationPanel = useNavigationPanel();

  React.useEffect(() => {
    navigationPanel.setTitle(title);

    return () => navigationPanel.setTitle('');
  }, [title, navigationPanel]);

  return <div className={cn('m-2.5')}>{children}</div>;
};
