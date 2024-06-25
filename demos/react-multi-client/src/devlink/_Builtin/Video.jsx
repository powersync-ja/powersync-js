import React from "react";
import { cj } from "../utils";
const getAspectRatio = ({ width, height }) =>
  height && width ? height / width : 0;
export const Video = React.forwardRef(function Video(
  {
    className = "",
    options = { height: 0, width: 0, title: "", url: "" },
    ...props
  },
  ref
) {
  const { height, title, url, width } = options;
  return (
    <div
      {...props}
      style={{ paddingTop: `${getAspectRatio(options) * 100}%` }}
      className={cj("w-video", "w-embed", className)}
      ref={ref}
    >
      <iframe
        className="embedly-embed"
        src={url}
        width={width}
        height={height}
        title={title}
        allowFullScreen
        scrolling="no"
        frameBorder="0"
      />
    </div>
  );
});
