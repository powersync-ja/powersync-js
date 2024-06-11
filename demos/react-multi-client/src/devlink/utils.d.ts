import * as React from "react";
import { CSSModules } from "./types";
export declare const cx: (style: CSSModules, ...classNames: string[]) => string;
export declare const cj: (
  ...classNames: (string | boolean | undefined)[]
) => string;
export declare const removeUnescaped: (value: string) => string;
export declare const replaceSelector: (
  selector: string,
  styles: CSSModules
) => string;
export declare function debounce<T extends (...args: any[]) => void>(
  this: void,
  func: T,
  timeout?: number
): (...args: Parameters<T>) => void;
export declare const EASING_FUNCTIONS: {
  linear: string;
  ease: string;
  "ease-in": string;
  "ease-out": string;
  "ease-in-out": string;
  "ease-in-sine": string;
  "ease-out-sine": string;
  "ease-in-out-sine": string;
  "ease-in-quad": string;
  "ease-out-quad": string;
  "ease-in-out-quad": string;
  "ease-in-cubic": string;
  "ease-out-cubic": string;
  "ease-in-out-cubic": string;
  "ease-in-quart": string;
  "ease-out-quart": string;
  "ease-in-out-quart": string;
  "ease-in-quint": string;
  "ease-out-quint": string;
  "ease-in-out-quint": string;
  "ease-in-expo": string;
  "ease-out-expo": string;
  "ease-in-out-expo": string;
  "ease-in-circ": string;
  "ease-out-circ": string;
  "ease-in-out-circ": string;
  "ease-in-back": string;
  "ease-out-back": string;
  "ease-in-out-back": string;
};
export declare const isServer: boolean;
export declare const useLayoutEffect: typeof React.useLayoutEffect;
export declare function useResizeObserver(
  ref: React.RefObject<HTMLElement>,
  fn: (entry: ResizeObserverEntry) => void,
  options?: {
    onlyWidth?: boolean;
  }
): void;
export declare function isUrl(str: string): boolean;
export declare function loadScript(
  src: string,
  options?: {
    async?: boolean;
    type?: string;
    defer?: boolean;
    cacheRegex?: RegExp;
  }
): Promise<unknown>;
export declare const KEY_CODES: {
  ARROW_LEFT: string;
  ARROW_UP: string;
  ARROW_RIGHT: string;
  ARROW_DOWN: string;
  SPACE: string;
  ENTER: string;
  HOME: string;
  END: string;
  TAB: string;
};
export declare function dispatchCustomEvent(
  element: Document | Element,
  eventName: string
): void;
export declare function useClickOut(
  ref: React.RefObject<HTMLElement>,
  action: () => void
): void;
export declare function extractElement<
  T extends React.JSXElementConstructor<any>
>(
  elements: React.ReactNode[],
  type: T
): {
  extracted: React.ReactNode;
  tree: React.ReactNode[];
};
