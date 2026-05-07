import React from 'react';

export type NavigationPanelController = {
  setTitle: (title: string) => void;
  title: string;
};

export const NavigationPanelContext = React.createContext<NavigationPanelController>({
  setTitle: () => {
    throw new Error(`No NavigationPanelContext has been provided`);
  },
  title: ''
});

export const NavigationPanelContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [title, setTitle] = React.useState('');

  return <NavigationPanelContext.Provider value={{ title, setTitle }}>{children}</NavigationPanelContext.Provider>;
};

export const useNavigationPanel = () => React.useContext(NavigationPanelContext);
