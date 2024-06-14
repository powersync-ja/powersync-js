import * as React from "react";
export const Heading = React.forwardRef(function Heading(
  { tag = "h1", ...props },
  ref
) {
  return React.createElement(tag, {
    ...props,
    ref,
  });
});
export const Paragraph = React.forwardRef(function Paragraph(props, ref) {
  return React.createElement("p", {
    ...props,
    ref,
  });
});
export const Emphasized = React.forwardRef(function Emphasized(props, ref) {
  return <em {...props} ref={ref} />;
});
export const Strong = React.forwardRef(function Strong(props, ref) {
  return React.createElement("strong", {
    ...props,
    ref,
  });
});
export const Figure = React.forwardRef(function Figure(
  { className = "", figure, ...props },
  ref
) {
  const { type, align } = figure;
  if (align) {
    className += `w-richtext-align-${align} `;
  }
  if (type) {
    className += `w-richtext-align-${type} `;
  }
  return <figure className={className} {...props} ref={ref} />;
});
export const Figcaption = React.forwardRef(function Figcaption(props, ref) {
  return <figcaption {...props} ref={ref} />;
});
export const Subscript = React.forwardRef(function Subscript(props, ref) {
  return <sub {...props} ref={ref} />;
});
export const Superscript = React.forwardRef(function Superrscript(props, ref) {
  return <sup {...props} ref={ref} />;
});
export const RichText = React.forwardRef(function RichText(
  { tag = "div", className = "", ...props },
  ref
) {
  return React.createElement(tag, {
    className: className + " w-richtext",
    ...props,
    ref,
  });
});
