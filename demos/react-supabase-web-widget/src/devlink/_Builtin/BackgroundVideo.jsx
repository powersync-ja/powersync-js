import React from "react";
import { cj, debounce } from "../utils";
const BgVideoContext = React.createContext({
  isPlaying: true,
  togglePlay: () => undefined,
});
export const BackgroundVideoWrapper = React.forwardRef(
  function BackgroundVideoWrapper(
    {
      tag = "div",
      className = "",
      autoPlay = true,
      loop = true,
      sources = [],
      posterImage = "",
      children,
    },
    ref
  ) {
    const [isPlaying, setIsPlaying] = React.useState(autoPlay);
    const video = React.useRef(null);
    React.useImperativeHandle(ref, () => video.current);
    const togglePlay = debounce(() => {
      setIsPlaying(!isPlaying);
      if (!video?.current) return;
      if (video.current.paused) {
        video.current.play();
      } else {
        video.current.pause();
      }
    });
    return (
      <BgVideoContext.Provider value={{ isPlaying, togglePlay }}>
        {React.createElement(
          tag,
          {
            className: cj(
              className,
              "w-background-video",
              "w-background-video-atom"
            ),
          },
          <video
            ref={video}
            autoPlay={autoPlay}
            loop={loop}
            style={
              posterImage
                ? { backgroundImage: `url("${posterImage}")` }
                : undefined
            }
            muted
            playsInline
          >
            {sources.map((url) => (
              <source src={url} key={url} />
            ))}
          </video>
        )}
        {children}
      </BgVideoContext.Provider>
    );
  }
);
export const BackgroundVideoPlayPauseButton = React.forwardRef(
  function BackgroundVideoPlayPauseButton({ children, className }, ref) {
    const { togglePlay } = React.useContext(BgVideoContext);
    return (
      <div aria-live="polite">
        <button
          type="button"
          className={cj(
            className,
            "w-backgroundvideo-backgroundvideoplaypausebutton",
            "w-background-video--control"
          )}
          onClick={togglePlay}
          ref={ref}
        >
          {children}
        </button>
      </div>
    );
  }
);
export const BackgroundVideoPlayPauseButtonPlaying = React.forwardRef(
  function BackgroundVideoPlayPauseButtonPlaying({ children }, ref) {
    const { isPlaying } = React.useContext(BgVideoContext);
    return (
      <span hidden={!isPlaying} ref={ref}>
        {children}
      </span>
    );
  }
);
export const BackgroundVideoPlayPauseButtonPaused = React.forwardRef(
  function BackgroundVideoPlayPauseButtonPaused({ children }, ref) {
    const { isPlaying } = React.useContext(BgVideoContext);
    return (
      <span hidden={isPlaying} ref={ref}>
        {children}
      </span>
    );
  }
);
