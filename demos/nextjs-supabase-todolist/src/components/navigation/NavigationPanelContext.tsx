import React from 'react';

export type NavigationPanelController = {
  setTitle: (title: string) => void;
};

export const NavigationPanelContext = React.createContext<NavigationPanelController>({
  setTitle: () => {
    throw new Error(`No NavigationPanelContext has been provided`);
  }
});

export const useNavigationPanel = () => React.useContext(NavigationPanelContext);
