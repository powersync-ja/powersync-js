import * as React from "react";
export type ElementProps<T extends keyof HTMLElementTagNameMap> =
  React.HTMLAttributes<HTMLElementTagNameMap[T]>;
export type Props<
  T extends keyof HTMLElementTagNameMap,
  U = unknown
> = ElementProps<T> & React.PropsWithChildren<U>;
export declare const Block: React.ForwardRefExoticComponent<
  {
    tag?: React.ElementType<any> | undefined;
  } & {
    children?: React.ReactNode;
  } & React.HTMLAttributes<HTMLOrSVGElement> &
    React.RefAttributes<unknown>
>;
export declare const Span: React.ForwardRefExoticComponent<
  React.RefAttributes<HTMLSpanElement>
>;
export declare const Blockquote: React.ForwardRefExoticComponent<
  React.RefAttributes<HTMLQuoteElement>
>;
export type LinkProps = Props<
  "a",
  {
    options?: {
      href: string;
      target?: "_self" | "_blank";
      preload?: "none" | "prefetch" | "prerender";
    };
    className?: string;
    button?: boolean;
    block?: string;
  }
>;
export declare const Link: React.ForwardRefExoticComponent<
  ElementProps<"a"> & {
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
export declare const List: React.ForwardRefExoticComponent<
  ElementProps<"ul"> & {
    tag?: React.ElementType<any> | undefined;
    unstyled?: boolean | undefined;
  } & {
    children?: React.ReactNode;
  } & React.RefAttributes<unknown>
>;
export declare const ListItem: React.ForwardRefExoticComponent<
  ElementProps<"li"> & {
    children?: React.ReactNode;
  } & React.RefAttributes<unknown>
>;
type ImageProps = React.DetailedHTMLProps<
  React.ImgHTMLAttributes<HTMLImageElement>,
  HTMLImageElement
>;
export declare const Image: React.ForwardRefExoticComponent<
  Omit<ImageProps, "ref"> & React.RefAttributes<HTMLImageElement>
>;
export declare const Section: React.ForwardRefExoticComponent<
  ElementProps<"section"> & {
    tag: React.ElementType;
  } & {
    children?: React.ReactNode;
  } & React.RefAttributes<unknown>
>;
export type TagProps = Props<
  keyof HTMLElementTagNameMap,
  {
    tag?: React.ElementType;
  }
>;
export declare const Container: React.ForwardRefExoticComponent<
  ElementProps<keyof HTMLElementTagNameMap> & {
    tag?: React.ElementType<any> | undefined;
  } & {
    children?: React.ReactNode;
  } & React.RefAttributes<unknown>
>;
export declare const BlockContainer: React.ForwardRefExoticComponent<
  ElementProps<keyof HTMLElementTagNameMap> & {
    tag?: React.ElementType<any> | undefined;
  } & {
    children?: React.ReactNode;
  } & React.RefAttributes<unknown>
>;
export declare const HFlex: React.ForwardRefExoticComponent<
  ElementProps<keyof HTMLElementTagNameMap> & {
    tag?: React.ElementType<any> | undefined;
  } & {
    children?: React.ReactNode;
  } & React.RefAttributes<unknown>
>;
export declare const VFlex: React.ForwardRefExoticComponent<
  ElementProps<keyof HTMLElementTagNameMap> & {
    tag?: React.ElementType<any> | undefined;
  } & {
    children?: React.ReactNode;
  } & React.RefAttributes<unknown>
>;
export declare const Layout: React.ForwardRefExoticComponent<
  ElementProps<keyof HTMLElementTagNameMap> & {
    tag?: React.ElementType<any> | undefined;
  } & {
    children?: React.ReactNode;
  } & React.RefAttributes<unknown>
>;
export declare const Cell: React.ForwardRefExoticComponent<
  ElementProps<keyof HTMLElementTagNameMap> & {
    tag?: React.ElementType<any> | undefined;
  } & {
    children?: React.ReactNode;
  } & React.RefAttributes<unknown>
>;
export declare const HtmlEmbed: React.ForwardRefExoticComponent<
  ElementProps<"div"> & {
    tag?: React.ElementType<any> | undefined;
    value: string;
  } & {
    children?: React.ReactNode;
  } & React.RefAttributes<unknown>
>;
export declare const Grid: React.ForwardRefExoticComponent<
  ElementProps<keyof HTMLElementTagNameMap> & {
    tag?: React.ElementType<any> | undefined;
  } & {
    children?: React.ReactNode;
  } & React.RefAttributes<unknown>
>;
export declare const Icon: React.ForwardRefExoticComponent<
  ElementProps<"div"> & {
    widget: {
      icon: string;
    };
  } & {
    children?: React.ReactNode;
  } & React.RefAttributes<unknown>
>;
type ColumnProps = Props<
  "div",
  {
    tag: React.ElementType;
    columnClasses?: string;
  }
>;
export declare const Column: React.ForwardRefExoticComponent<
  ElementProps<"div"> & {
    tag: React.ElementType;
    columnClasses?: string | undefined;
  } & {
    children?: React.ReactNode;
  } & React.RefAttributes<unknown>
>;
export declare const Row: React.ForwardRefExoticComponent<
  ElementProps<"div"> & {
    children: React.ReactElement<ColumnProps>[];
    tag: React.ElementType;
    columns: {
      [key: string]: string;
    };
    value: string;
  } & {
    children?: React.ReactNode;
  } & React.RefAttributes<unknown>
>;
export declare const NotSupported: React.ForwardRefExoticComponent<
  React.RefAttributes<HTMLDivElement>
>;
export {};
