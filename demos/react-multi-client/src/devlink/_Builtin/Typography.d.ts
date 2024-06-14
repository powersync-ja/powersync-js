import * as React from "react";
export declare const Heading: React.ForwardRefExoticComponent<
  {
    tag?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | undefined;
  } & {
    children?: React.ReactNode;
  } & React.HTMLAttributes<HTMLHeadingElement> &
    React.RefAttributes<unknown>
>;
export declare const Paragraph: React.ForwardRefExoticComponent<
  import("./Basic").ElementProps<"p"> & {
    children?: React.ReactNode;
  } & React.RefAttributes<unknown>
>;
export declare const Emphasized: React.ForwardRefExoticComponent<
  import("./Basic").ElementProps<"em"> & {
    children?: React.ReactNode;
  } & React.RefAttributes<HTMLElement>
>;
export declare const Strong: React.ForwardRefExoticComponent<
  import("./Basic").ElementProps<"strong"> & {
    children?: React.ReactNode;
  } & React.RefAttributes<unknown>
>;
export declare const Figure: React.ForwardRefExoticComponent<
  import("./Basic").ElementProps<"figure"> & {
    children?: React.ReactNode;
  } & {
    figure: {
      align: string;
      type: string;
    };
  } & React.RefAttributes<HTMLImageElement>
>;
export declare const Figcaption: React.ForwardRefExoticComponent<
  import("./Basic").ElementProps<"figcaption"> & {
    children?: React.ReactNode;
  } & React.RefAttributes<HTMLElement>
>;
export declare const Subscript: React.ForwardRefExoticComponent<
  import("./Basic").ElementProps<"sub"> & {
    children?: React.ReactNode;
  } & React.RefAttributes<HTMLElement>
>;
export declare const Superscript: React.ForwardRefExoticComponent<
  import("./Basic").ElementProps<"sup"> & {
    children?: React.ReactNode;
  } & React.RefAttributes<HTMLElement>
>;
export declare const RichText: React.ForwardRefExoticComponent<
  import("./Basic").ElementProps<"div"> & {
    tag?: React.ElementType<any> | undefined;
  } & {
    children?: React.ReactNode;
  } & React.RefAttributes<unknown>
>;
