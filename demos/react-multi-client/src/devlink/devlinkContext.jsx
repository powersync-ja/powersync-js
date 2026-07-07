import React from "react";
import { InteractionsProvider } from "./interactions";
import { createIX2Engine } from "./devlink";
export const DevLinkContext = React.createContext({});
export const DevLinkProvider = ({ children, ...context }) =>
  React.createElement(
    DevLinkContext.Provider,
    { value: context },
    React.createElement(
      InteractionsProvider,
      { createEngine: createIX2Engine },
      children
    )
  );
