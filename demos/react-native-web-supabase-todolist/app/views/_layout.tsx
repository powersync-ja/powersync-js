import React from 'react';
import { useSystem } from '../../library/powersync/system';
import Drawer from '../../library/widgets/Drawer';

/**
 * This layout uses a navigation Drawer for app views
 */
const HomeLayout = () => {
  const system = useSystem();

  React.useEffect(() => {
    system.init();
  }, []);

  return (
    <Drawer>
      <Drawer.Screen
        name="console"
        options={{
          drawerLabel: 'SQL Console',
          title: 'SQL Console'
        }}
      />
      <Drawer.Screen
        name="todos"
        options={{
          drawerLabel: 'Todo Lists',
          title: 'Todo Lists'
        }}
      />
      <Drawer.Screen
        name="signout"
        options={{
          drawerLabel: 'Sign Out'
        }}
      />
    </Drawer>
  );
};

export default HomeLayout;
