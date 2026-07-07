import * as React from "react";
import { LinkProps } from "./Basic";
type DropdownProps = React.PropsWithChildren<{
  tag?: keyof HTMLElementTagNameMap;
  className?: string;
}>;
export declare const DropdownWrapper: React.ForwardRefExoticComponent<
  {
    tag?: keyof HTMLElementTagNameMap;
    className?: string;
  } & {
    children?: React.ReactNode | undefined;
  } & {
    children: React.ReactElement<DropdownToggleProps | DropdownListProps>;
    delay: number;
    hover: boolean;
  } & React.RefAttributes<unknown>
>;
type DropdownToggleProps = DropdownProps;
export declare const DropdownToggle: React.ForwardRefExoticComponent<
  {
    tag?: keyof HTMLElementTagNameMap;
    className?: string;
  } & {
    children?: React.ReactNode | undefined;
  } & React.RefAttributes<unknown>
>;
type DropdownListProps = DropdownProps & {
  children:
    | React.ReactElement<DropdownLinkProps>
    | React.ReactElement<DropdownLinkProps>[];
};
export declare const DropdownList: React.ForwardRefExoticComponent<
  {
    tag?: keyof HTMLElementTagNameMap;
    className?: string;
  } & {
    children?: React.ReactNode | undefined;
  } & {
    children:
      | React.ReactElement<DropdownLinkProps>
      | React.ReactElement<DropdownLinkProps>[];
  } & React.RefAttributes<unknown>
>;
type DropdownLinkProps = DropdownProps & LinkProps;
export declare const DropdownLink: React.ForwardRefExoticComponent<
  {
    tag?: keyof HTMLElementTagNameMap;
    className?: string;
  } & {
    children?: React.ReactNode | undefined;
  } & import("./Basic").ElementProps<"a"> & {
      options?: {
        href: string;
        target?: "_self" | "_blank";
        preload?: "none" | "prefetch" | "prerender";
      };
      className?: string;
      button?: boolean;
      block?: string;
    } & React.RefAttributes<HTMLAnchorElement>
>;
export {};
