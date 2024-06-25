import * as React from "react";
import { LinkProps } from "./Basic";
type DropdownProps = React.PropsWithChildren<{
  tag?: keyof HTMLElementTagNameMap;
  className?: string;
}>;
export declare const DropdownWrapper: React.ForwardRefExoticComponent<
  {
    tag?: keyof HTMLElementTagNameMap | undefined;
    className?: string | undefined;
  } & {
    children?: React.ReactNode;
  } & {
    children: React.ReactElement<DropdownToggleProps | DropdownListProps>;
    delay: number;
    hover: boolean;
  } & React.RefAttributes<unknown>
>;
type DropdownToggleProps = DropdownProps;
export declare const DropdownToggle: React.ForwardRefExoticComponent<
  {
    tag?: keyof HTMLElementTagNameMap | undefined;
    className?: string | undefined;
  } & {
    children?: React.ReactNode;
  } & React.RefAttributes<unknown>
>;
type DropdownListProps = DropdownProps & {
  children:
    | React.ReactElement<DropdownLinkProps>
    | React.ReactElement<DropdownLinkProps>[];
};
export declare const DropdownList: React.ForwardRefExoticComponent<
  {
    tag?: keyof HTMLElementTagNameMap | undefined;
    className?: string | undefined;
  } & {
    children?: React.ReactNode;
  } & {
    children:
      | React.ReactElement<DropdownLinkProps>
      | React.ReactElement<DropdownLinkProps>[];
  } & React.RefAttributes<unknown>
>;
type DropdownLinkProps = DropdownProps & LinkProps;
export declare const DropdownLink: React.ForwardRefExoticComponent<
  {
    tag?: keyof HTMLElementTagNameMap | undefined;
    className?: string | undefined;
  } & {
    children?: React.ReactNode;
  } & import("./Basic").ElementProps<"a"> & {
      options?:
        | {
            href: string;
            target?: "_self" | "_blank" | undefined;
            preload?: "none" | "prerender" | "prefetch" | undefined;
          }
        | undefined;
      className?: string | undefined;
      button?: boolean | undefined;
      block?: string | undefined;
    } & React.RefAttributes<HTMLAnchorElement>
>;
export {};
