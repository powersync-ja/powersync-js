import * as React from "react";
import * as Types from "./types";

declare function UserA(props: {
  as?: React.ElementType;
  userASlot?: Types.Devlink.Slot;
  online?: Types.Visibility.VisibilityConditions;
  offline?: Types.Visibility.VisibilityConditions;
  content?: Types.Devlink.Slot;
  buttonCreate?: Types.Devlink.RuntimeProps;
  buttonUpdate?: Types.Devlink.RuntimeProps;
  buttonDelete?: Types.Devlink.RuntimeProps;
  logText?: React.ReactNode;
  writesFalse?: Types.Visibility.VisibilityConditions;
  writesTrue?: Types.Visibility.VisibilityConditions;
  writePath?: Types.Devlink.RuntimeProps;
  readsFalse?: Types.Visibility.VisibilityConditions;
  readsTrue?: Types.Visibility.VisibilityConditions;
  readPath?: Types.Devlink.RuntimeProps;
  onlineSync?: Types.Visibility.VisibilityConditions;
  onlineOfflineToggle?: Types.Devlink.RuntimeProps;
}): React.JSX.Element;
