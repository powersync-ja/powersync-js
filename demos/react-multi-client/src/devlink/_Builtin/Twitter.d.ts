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
    className?: string | undefined;
    mode?: TwitterMode | undefined;
    url?: string | undefined;
    text?: string | undefined;
    size?: TwitterSize | undefined;
  } & {
    children?: React.ReactNode;
  } & React.RefAttributes<HTMLDivElement>
>;
export {};
