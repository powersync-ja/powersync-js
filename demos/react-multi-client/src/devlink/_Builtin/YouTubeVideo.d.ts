import * as React from "react";
type YouTubeVideoProps = {
  className?: string;
  title: string;
  videoId: string;
  aspectRatio?: number;
  startAt?: number;
  showAllRelatedVideos?: boolean;
  controls?: boolean;
  autoplay?: boolean;
  muted?: boolean;
  privacyMode?: boolean;
};
export declare const YouTubeVideo: React.ForwardRefExoticComponent<
  YouTubeVideoProps & React.RefAttributes<HTMLDivElement>
>;
export {};
