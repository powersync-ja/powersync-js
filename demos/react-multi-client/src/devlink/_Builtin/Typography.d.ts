import * as React from "react";
export declare const Heading: React.ForwardRefExoticComponent<
  {
    tag?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  } & {
    children?: React.ReactNode | undefined;
  } & React.HTMLAttributes<HTMLHeadingElement> &
    React.RefAttributes<unknown>
>;
export declare const Paragraph: React.ForwardRefExoticComponent<
  import("./Basic").ElementProps<"p"> & {
    children?: React.ReactNode | undefined;
  } & React.RefAttributes<unknown>
>;
export declare const Emphasized: React.ForwardRefExoticComponent<
  import("./Basic").ElementProps<"em"> & {
    children?: React.ReactNode | undefined;
  } & React.RefAttributes<HTMLElement>
>;
export declare const Strong: React.ForwardRefExoticComponent<
  import("./Basic").ElementProps<"strong"> & {
    children?: React.ReactNode | undefined;
  } & React.RefAttributes<unknown>
>;
export declare const Figure: React.ForwardRefExoticComponent<
  import("./Basic").ElementProps<"figure"> & {
    children?: React.ReactNode | undefined;
  } & {
    figure: {
      align: string;
      type: string;
    };
  } & React.RefAttributes<HTMLImageElement>
>;
export declare const Figcaption: React.ForwardRefExoticComponent<
  import("./Basic").ElementProps<"figcaption"> & {
    children?: React.ReactNode | undefined;
  } & React.RefAttributes<HTMLElement>
>;
export declare const Subscript: React.ForwardRefExoticComponent<
  import("./Basic").ElementProps<"sub"> & {
    children?: React.ReactNode | undefined;
  } & React.RefAttributes<HTMLElement>
>;
export declare const Superscript: React.ForwardRefExoticComponent<
  import("./Basic").ElementProps<"sup"> & {
    children?: React.ReactNode | undefined;
  } & React.RefAttributes<HTMLElement>
>;
export declare const RichText: React.ForwardRefExoticComponent<
  import("./Basic").ElementProps<"div"> & {
    tag?: React.ElementType;
  } & {
    children?: React.ReactNode | undefined;
  } & React.RefAttributes<unknown>
>;
