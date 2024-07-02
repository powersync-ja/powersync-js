import * as React from "react";
import { EASING_FUNCTIONS } from "../utils";
import { LinkProps, TagProps } from "./Basic";
declare const BREAKPOINTS: {
  medium: number;
  small: number;
  tiny: number;
};
type NavbarConfig = {
  animation: string;
  collapse: keyof typeof BREAKPOINTS;
  docHeight: boolean;
  duration: number;
  easing: keyof typeof EASING_FUNCTIONS;
  easing2: keyof typeof EASING_FUNCTIONS;
  noScroll: boolean;
};
export declare const NavbarContext: React.Context<
  NavbarConfig & {
    animDirect: -1 | 1;
    animOver: boolean;
    getBodyHeight: () => number | void;
    getOverlayHeight: () => number | undefined;
    isOpen: boolean;
    menu: React.MutableRefObject<HTMLElement | null>;
    root: React.MutableRefObject<HTMLElement | null>;
    toggleOpen: () => void;
    navbarMounted: boolean;
    setFocusedLink: React.Dispatch<React.SetStateAction<number>>;
  }
>;
type NavbarChildrenType =
  | NavbarContainerProps
  | NavbarBrandProps
  | NavbarMenuProps
  | NavbarButtonProps;
type NavbarProps = {
  tag: React.ElementType;
  config: NavbarConfig;
  className?: string;
  children?:
    | React.ReactElement<NavbarChildrenType>[]
    | React.ReactElement<NavbarChildrenType>;
};
export declare const NavbarWrapper: React.ForwardRefExoticComponent<
  NavbarProps & React.RefAttributes<unknown>
>;
type NavbarContainerProps = TagProps & {
  toggleOpen: () => void;
  isOpen: boolean;
  children: React.ReactNode;
};
export declare const NavbarContainer: React.ForwardRefExoticComponent<
  import("./Basic").ElementProps<keyof HTMLElementTagNameMap> & {
    tag?: React.ElementType<any> | undefined;
  } & {
    children?: React.ReactNode;
  } & {
    toggleOpen: () => void;
    isOpen: boolean;
    children: React.ReactNode;
  } & React.RefAttributes<unknown>
>;
type NavbarBrandProps = LinkProps;
export declare const NavbarBrand: React.ForwardRefExoticComponent<
  import("./Basic").ElementProps<"a"> & {
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
  } & {
    children?: React.ReactNode;
  } & React.RefAttributes<HTMLAnchorElement>
>;
type NavbarMenuProps = React.PropsWithChildren<{
  tag?: React.ElementType;
  className?: string;
  isOpen?: boolean;
}>;
export declare const NavbarMenu: React.ForwardRefExoticComponent<
  {
    tag?: React.ElementType<any> | undefined;
    className?: string | undefined;
    isOpen?: boolean | undefined;
  } & {
    children?: React.ReactNode;
  } & React.RefAttributes<unknown>
>;
export declare const NavbarLink: React.ForwardRefExoticComponent<
  import("./Basic").ElementProps<"a"> & {
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
  } & {
    children?: React.ReactNode;
  } & React.RefAttributes<HTMLAnchorElement>
>;
type NavbarButtonProps = React.PropsWithChildren<{
  tag?: React.ElementType;
  className?: string;
}>;
export declare const NavbarButton: React.ForwardRefExoticComponent<
  {
    tag?: React.ElementType<any> | undefined;
    className?: string | undefined;
  } & {
    children?: React.ReactNode;
  } & React.RefAttributes<unknown>
>;
export {};
