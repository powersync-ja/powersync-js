import * as React from "react";
import { CSSModules } from "./types";
type IXData = any;
export declare const IXContext: React.Context<{
  initEngine: ((data: IXData, styles?: CSSModules) => void) | null;
  restartEngine: (() => void) | null;
}>;
type IXEngine = {
  init: (data: IXData) => void;
};
type InteractionProviderProps = {
  children: React.ReactNode;
  createEngine: () => IXEngine;
};
export declare const InteractionsProvider: React.FC<InteractionProviderProps>;
export declare const useInteractions: (
  data: IXData,
  styles?: CSSModules
) => void;
export declare function triggerIXEvent(
  element: HTMLElement | null | undefined,
  active: boolean
): void;
export declare function useIXEvent(
  element: HTMLElement | null | undefined,
  active: boolean
): void;
export {};
