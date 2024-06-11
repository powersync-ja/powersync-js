import * as React from "react";
import { DevLinkContext } from "../devlinkContext";
import * as utils from "../utils";
export const Block = React.forwardRef(function Block(
  { tag = "div", ...props },
  ref
) {
  return React.createElement(tag, {
    ...props,
    ref,
  });
});
export const Span = React.forwardRef(function Span(props, ref) {
  return <span {...props} ref={ref} />;
});
export const Blockquote = React.forwardRef(function Blockquote(props, ref) {
  return <blockquote {...props} ref={ref} />;
});
export const Link = React.forwardRef(function Link(
  {
    options = { href: "#" },
    className = "",
    button = false,
    children,
    block = "",
    ...props
  },
  ref
) {
  const { renderLink: UserLink } = React.useContext(DevLinkContext);
  if (button) className += " w-button";
  if (block === "inline") className += " w-inline-block";
  if (UserLink) {
    return (
      <UserLink className={className} {...options} {...props} ref={ref}>
        {children}
      </UserLink>
    );
  }
  const { href, target, preload = "none" } = options;
  const shouldRenderResource =
    preload !== "none" && typeof href === "string" && !href.startsWith("#");
  return (
    <>
      <a href={href} target={target} className={className} {...props} ref={ref}>
        {children}
      </a>
      {shouldRenderResource && <link rel={preload} href={href} />}
    </>
  );
});
export const List = React.forwardRef(function List(
  { tag = "ul", unstyled = true, className = "", ...props },
  ref
) {
  return React.createElement(tag, {
    role: "list",
    className: className + (unstyled ? " w-list-unstyled" : ""),
    ...props,
    ref,
  });
});
export const ListItem = React.forwardRef(function ListItem(props, ref) {
  return React.createElement("li", {
    ...props,
    ref,
  });
});
export const Image = React.forwardRef(function Image({ alt, ...props }, ref) {
  const { renderImage: UserImage } = React.useContext(DevLinkContext);
  return UserImage ? (
    <UserImage alt={alt || ""} {...props} ref={ref} />
  ) : (
    <img alt={alt || ""} {...props} ref={ref} />
  );
});
export const Section = React.forwardRef(function Section(
  { tag = "section", ...props },
  ref
) {
  return React.createElement(tag, {
    ...props,
    ref,
  });
});
export const Container = React.forwardRef(function Container(
  { tag = "div", className = "", ...props },
  ref
) {
  return React.createElement(tag, {
    className: className + " w-container",
    ref,
    ...props,
  });
});
export const BlockContainer = React.forwardRef(function BlockContainer(
  { tag = "div", className = "", ...props },
  ref
) {
  return React.createElement(tag, {
    className: className + " w-layout-blockcontainer",
    ...props,
    ref,
  });
});
export const HFlex = React.forwardRef(function HFlex(
  { tag = "div", className = "", ...props },
  ref
) {
  return React.createElement(tag, {
    className: className + " w-layout-hflex",
    ...props,
    ref,
  });
});
export const VFlex = React.forwardRef(function VFlex(
  { tag = "div", className = "", ...props },
  ref
) {
  return React.createElement(tag, {
    className: className + " w-layout-vflex",
    ...props,
    ref,
  });
});
export const Layout = React.forwardRef(function Layout(
  { tag = "div", className = "", ...props },
  ref
) {
  return React.createElement(tag, {
    className: className + " w-layout-layout wf-layout-layout",
    ...props,
    ref,
  });
});
export const Cell = React.forwardRef(function Cell(
  { tag = "div", className = "", ...props },
  ref
) {
  return React.createElement(tag, {
    className: className + " w-layout-cell",
    ...props,
    ref,
  });
});
export const HtmlEmbed = React.forwardRef(function HtmlEmbed(
  { tag = "div", className = "", value = "", ...props },
  ref
) {
  return React.createElement(tag, {
    className: className + " w-embed",
    dangerouslySetInnerHTML: { __html: utils.removeUnescaped(value) },
    ...props,
    ref,
  });
});
export const Grid = React.forwardRef(function Grid(
  { tag = "div", className = "", ...props },
  ref
) {
  return React.createElement(tag, {
    className: className + " w-layout-grid",
    ...props,
    ref,
  });
});
export const Icon = React.forwardRef(function Icon(
  { widget, className = "", ...props },
  ref
) {
  return React.createElement("div", {
    className: className + ` w-icon-${widget.icon}`,
    ...props,
    ref,
  });
});
export const Column = React.forwardRef(function Column(
  { tag = "div", className = "", columnClasses = "", ...props },
  ref
) {
  return React.createElement(tag, {
    className: className + " w-col " + columnClasses,
    ...props,
    ref,
  });
});
const transformWidths = (width, index) => {
  const widths = width?.split("|") ?? [];
  return widths.length > 1 ? widths[index] : width;
};
const columnClass = (width, key) => {
  if (/stack$/.test(width)) return "w-col-stack";
  if (/main$/.test(key)) return `w-col-${width}`;
  return `w-col-${key}-${width}`;
};
export const Row = React.forwardRef(function Row(
  { tag = "div", className = "", columns, children, ...props },
  ref
) {
  return React.createElement(
    tag,
    { className: className + " w-row", ...props, ref },
    columns
      ? React.Children.map(children, (child, index) => {
          if (child && typeof child === "object" && child.type !== Column)
            return child;
          const columnClasses = Object.entries(columns ?? {}).reduce(
            (acc, [key, value]) => {
              const width = transformWidths(
                value === "custom" ? "6|6" : value,
                index
              );
              acc.add(width ? columnClass(width, key) : "");
              return acc;
            },
            new Set()
          );
          return React.cloneElement(child, {
            columnClasses: [...columnClasses].join(" "),
            ...child.props,
          });
        })
      : children
  );
});
export const NotSupported = React.forwardRef(function NotSupported(
  { _atom = "" },
  ref
) {
  return (
    <div ref={ref}>{`This builtin is not currently supported: ${_atom}`}</div>
  );
});
