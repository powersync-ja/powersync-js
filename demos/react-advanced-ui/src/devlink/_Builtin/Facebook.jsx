import * as React from "react";
import { isUrl } from "../utils";
export const Facebook = React.forwardRef(function Facebook(
  {
    className = "",
    layout = "standard",
    width = 250,
    height = 50,
    url = "https://facebook.com/webflow",
    locale = "en_US",
    ...props
  },
  ref
) {
  if (!isUrl(url)) {
    url = "https://facebook.com/webflow";
  }
  if (!/^http/.test(url)) {
    url = "http://" + url;
  }
  const params = {
    href: url,
    layout,
    locale,
    action: "like",
    show_faces: "false",
    share: "false",
  };
  const queryParams = Object.keys(params).map(
    (key) => `${key}=${encodeURIComponent(params[key])}`
  );
  const frameSrc = `https://www.facebook.com/plugins/like.php?${queryParams.join(
    "&"
  )}`;
  return (
    <div
      {...props}
      className={className + " w-widget w-widget-facebook"}
      ref={ref}
    >
      <iframe
        title="Facebook Like Button"
        src={frameSrc}
        style={{ border: "none", overflow: "hidden", width, height }}
      ></iframe>
    </div>
  );
});
