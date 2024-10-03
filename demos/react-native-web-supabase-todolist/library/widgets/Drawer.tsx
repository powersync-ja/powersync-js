import React from 'react';
import _ from 'lodash';
import { createDrawerNavigator, DrawerNavigationOptions } from '@react-navigation/drawer';

import { withLayoutContext } from 'expo-router';
import { HeaderWidget } from './HeaderWidget';

const DrawerNavigator = createDrawerNavigator().Navigator as React.ComponentType<any>;

export const Drawer = withLayoutContext<DrawerNavigationOptions, typeof DrawerNavigator>(DrawerNavigator, (options) =>
  _.chain(options)
    .map((o) => ({ ...o, options: { ...o.options, header: () => <HeaderWidget title={o.options?.title || ''} /> } }))
    .value()
);

export default Drawer;
