import * as React from "react";
import { cj } from "../utils";
const DEFAULT_16_9_RATIO = 0.5617021276595745;
export const YouTubeVideo = React.forwardRef(function YouTubeVideo(
  {
    className = "",
    title,
    videoId,
    aspectRatio = DEFAULT_16_9_RATIO,
    startAt = 0,
    showAllRelatedVideos = false,
    controls = true,
    autoplay = false,
    muted = false,
    privacyMode = false,
    ...props
  },
  ref
) {
  const baseUrl = privacyMode
    ? "https://www.youtube-nocookie.com/embed"
    : "https://www.youtube.com/embed";
  const urlParams = Object.entries({
    startAt,
    showAllRelatedVideos,
    controls,
    autoplay,
    muted,
  })
    .map(([k, v]) => `${k}=${Number(v)}`)
    .join("&");
  const iframeStyle = {
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "auto",
  };
  return (
    <div
      {...props}
      style={{ paddingTop: `${aspectRatio * 100}%` }}
      className={cj("w-embed-youtubevideo", className)}
      ref={ref}
    >
      <iframe
        src={`${baseUrl}/${videoId}?${urlParams}`}
        title={title}
        allowFullScreen
        scrolling="no"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        style={iframeStyle}
      />
    </div>
  );
});
