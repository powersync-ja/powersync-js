import { UserA, UserB } from '@/devlink';
import React from 'react';

export type OpenUserProps = Parameters<typeof UserA>[0] & { leftSide?: boolean };

type EventHandler = { onClick: () => void };

export type UserProps = {
  online?: boolean;
  offline?: boolean;
  content?: React.ReactNode;
  buttonCreate?: EventHandler;
  buttonUpdate?: EventHandler;
  buttonDelete?: EventHandler;
  logText?: React.ReactNode;
  writesFalse?: boolean;
  writesTrue?: boolean;
  writePath?: EventHandler;
  readsFalse?: boolean;
  readsTrue?: boolean;
  readPath?: EventHandler;
  onlineSync?: boolean;
  onlineOfflineToggle?: EventHandler;
  leftSide?: boolean;
};

export const UserFacade: React.FC<UserProps> = (props) => {
  // To drop the devlink dependency, you can introduce your own "user" component that uses the `UserProps`.
  const User = props.leftSide ? UserA : UserB;
  return <User {...props} />;
};
