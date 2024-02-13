import "@azure/core-asynciterator-polyfill";
import "react-native-polyfill-globals/auto";
import {
  PowerSyncContext,
  RNQSPowerSyncDatabaseOpenFactory,
} from "@journeyapps/powersync-sdk-react-native";
import { ReactNode, useMemo } from "react";

import { useAuth } from "./AuthProvider";
import { Connector } from "../lib/connector";
import { schema } from "../lib/schema";

const factory = new RNQSPowerSyncDatabaseOpenFactory({
  schema,
  dbFilename: "test.sqlite",
  //location: 'optional location directory to DB file'
});

const connector = new Connector();

export const PowerSyncProvider = ({ children }: { children: ReactNode }) => {
  const { isSyncEnabled } = useAuth();

  const powerSync = useMemo(() => {
    const powerSync = factory.getInstance();
    powerSync.init();

    if (isSyncEnabled) {
      powerSync
        .connect(connector)
        .then(() => console.log("connected"))
        .catch(console.error);
    } else {
      powerSync
        .disconnect()
        .then(() => console.log("not connected"))
        .catch(console.error);
    }

    return powerSync;
  }, [isSyncEnabled]);

  return (
    <PowerSyncContext.Provider value={powerSync}>
      {children}
    </PowerSyncContext.Provider>
  );
};
