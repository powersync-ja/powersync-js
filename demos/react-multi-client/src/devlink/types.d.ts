import * as React from "react";
export type CSSModules = {
  [sel: string]: string;
};
export declare namespace Basic {
  type PreloadedLink = {
    preload?: "prerender" | "prefetch" | "none";
  };
  type TargetedLink = {
    target?: "_self" | "_blank";
  };
  type PreloadedAndTargetedLink = PreloadedLink & TargetedLink;
  export type Link = {
    href: string;
  } & PreloadedAndTargetedLink;
  export type RichTextChildren = React.ReactNode;
  export {};
}
export declare namespace Asset {
  type Image = string;
}
export declare namespace Embed {
  type Video = {
    height: number;
    width: number;
    title: string;
    url: string;
  };
}
export declare namespace Visibility {
  type VisibilityConditions = boolean;
}
