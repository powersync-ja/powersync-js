import * as React from "react";
import { isUrl, loadScript } from "../utils";
const modeDict = {
  follow: "createFollowButton",
  tweet: "createShareButton",
};
const sizeDict = {
  m: "medium",
  l: "large",
};
export const Twitter = React.forwardRef(function Twitter(
  {
    className = "",
    url = "https://webflow.com",
    mode = "tweet",
    size = "m",
    text = "Check out this site",
    ...props
  },
  ref
) {
  const innerRef = React.useRef(null);
  React.useImperativeHandle(ref, () => innerRef.current);
  if (!isUrl(url)) {
    if (mode === "tweet") {
      url = "https://webflow.com/";
    } else if (mode === "follow") {
      url = "webflow";
    }
  }
  React.useEffect(() => {
    let isComponentMounted = true;
    loadScript("https://platform.twitter.com/widgets.js").then(() => {
      if (isComponentMounted) {
        if (window.twttr) {
          const twitterButtonOption = window.twttr.widgets[modeDict[mode]];
          if (twitterButtonOption) {
            twitterButtonOption(url, innerRef?.current, {
              size: sizeDict[size],
              text,
            });
          }
        }
      }
    });
    return () => {
      isComponentMounted = false;
    };
  }, []);
  return (
    <div
      {...props}
      className={className + " w-widget w-widget-twitter"}
      ref={innerRef}
    />
  );
});
