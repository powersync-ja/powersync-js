import { AbstractPowerSyncDatabase } from '@journeyapps/powersync-sdk-common';
import React from 'react';

export const PowerSyncContext = React.createContext<AbstractPowerSyncDatabase | null>(null);
export const usePowerSync = () => React.useContext(PowerSyncContext);
