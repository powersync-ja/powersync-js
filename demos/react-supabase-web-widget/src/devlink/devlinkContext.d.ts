import React from "react";
export type RenderLink = React.FC<{
  href: string;
  target?: "_self" | "_blank";
  preload?: "none" | "prefetch" | "prerender";
  className?: string;
  children?: React.ReactNode;
  ref?: React.Ref<HTMLAnchorElement>;
}>;
export type RenderImage = React.FC<
  React.DetailedHTMLProps<
    React.ImgHTMLAttributes<HTMLImageElement>,
    HTMLImageElement
  >
>;
export declare const DevLinkContext: any;
type DevLinkProviderProps = {
  renderLink?: RenderLink;
  renderImage?: RenderImage;
  children: React.ReactNode;
};
export declare const DevLinkProvider: React.FC<DevLinkProviderProps>;
export {};
