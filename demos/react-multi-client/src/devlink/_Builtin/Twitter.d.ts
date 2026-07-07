import * as React from "react";
type TwitterSize = "m" | "l";
type TwitterMode = "follow" | "tweet";
declare global {
  interface Window {
    twttr: any;
  }
}
export declare const Twitter: React.ForwardRefExoticComponent<
  {
    className?: string;
    mode?: TwitterMode;
    url?: string;
    text?: string;
    size?: TwitterSize;
  } & {
    children?: React.ReactNode | undefined;
  } & React.RefAttributes<HTMLDivElement>
>;
export {};
