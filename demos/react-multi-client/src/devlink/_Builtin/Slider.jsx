import * as React from "react";
import { IXContext, triggerIXEvent } from "../interactions";
import { EASING_FUNCTIONS, KEY_CODES, cj, debounce } from "../utils";
const DEFAULT_SLIDER_CONFIG = {
  navSpacing: 3,
  navShadow: false,
  autoplay: false,
  delay: 4000,
  iconArrows: true,
  animation: "slide",
  navNumbers: true,
  easing: "ease",
  navRound: true,
  hideArrows: false,
  disableSwipe: false,
  duration: 500,
  infinite: true,
  autoMax: 0,
  navInvert: false,
};
export const SliderContext = React.createContext({
  ...DEFAULT_SLIDER_CONFIG,
  slideAmount: 0,
  setSlideAmount: () => undefined,
  setCurrentSlide: () => undefined,
  goToNextSlide: () => undefined,
  goToPreviousSlide: () => undefined,
  slide: { current: 0, previous: 0 },
  isAutoplayPaused: false,
  setAutoplayPause: () => undefined,
});
function useSwipe({ onSwipeLeft, onSwipeRight, config }) {
  const SWIPE_DELTA = 150;
  const [touchStart, setTouchStart] = React.useState(0);
  const [touchEnd, setTouchEnd] = React.useState(0);
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };
  const handleTouchMove = (e) => {
    setTouchEnd(e.touches[0].clientX);
  };
  const handleTouchEnd = () => {
    if (config?.disableSwipe) return;
    if (touchStart - touchEnd > SWIPE_DELTA) {
      onSwipeLeft();
    }
    if (touchStart - touchEnd < -SWIPE_DELTA) {
      onSwipeRight();
    }
  };
  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}
export const SliderWrapper = React.forwardRef(function SlideWrapper(
  { className = "", ...props },
  ref
) {
  const [slideAmount, setSlideAmount] = React.useState(0);
  const [selectedSlide, setSelectedSlide] = React.useState(0);
  const [prevSelectedSlide, setPrevSelectedSlide] = React.useState(0);
  const [isAutoplayPaused, setAutoplayPause] = React.useState(false);
  const setCurrentSlide = debounce((value) => {
    setSelectedSlide((prev) => {
      setPrevSelectedSlide(prev);
      return value;
    });
  });
  const goToNextSlide = debounce(() => {
    if (selectedSlide === slideAmount - 1) {
      setCurrentSlide(0);
    } else {
      setCurrentSlide(selectedSlide + 1);
    }
  });
  const goToPreviousSlide = debounce(() => {
    if (selectedSlide === 0) {
      setCurrentSlide(slideAmount - 1);
    } else {
      setCurrentSlide(selectedSlide - 1);
    }
  });
  const swipeHandlers = useSwipe({
    onSwipeLeft: goToNextSlide,
    onSwipeRight: goToPreviousSlide,
  });
  return (
    <SliderContext.Provider
      value={{
        ...props,
        slideAmount,
        setSlideAmount,
        slide: { current: selectedSlide, previous: prevSelectedSlide },
        setCurrentSlide,
        goToNextSlide,
        goToPreviousSlide,
        isAutoplayPaused,
        setAutoplayPause,
      }}
    >
      <div
        {...swipeHandlers}
        className={cj(className, "w-slider")}
        role="region"
        aria-label="carousel"
        ref={ref}
      >
        {props.children}
      </div>
    </SliderContext.Provider>
  );
});
function useAutoplay() {
  const {
    autoplay,
    delay,
    autoMax,
    isAutoplayPaused,
    setAutoplayPause,
    goToNextSlide,
  } = React.useContext(SliderContext);
  const [autoMaxCount, setAutoMaxCount] = React.useState(0);
  const autoMaxReached = React.useMemo(
    () => autoMaxCount >= autoMax && autoMax > 0,
    [autoMax, autoMaxCount]
  );
  React.useEffect(() => {
    const shouldAutoplay = autoplay && !autoMaxReached && !isAutoplayPaused;
    if (shouldAutoplay) {
      const interval = setInterval(() => {
        setAutoMaxCount((prev) => prev + 1);
        goToNextSlide();
      }, delay);
      return () => clearInterval(interval);
    }
  }, [autoplay, delay, goToNextSlide, autoMaxReached, isAutoplayPaused]);
  const resumeAutoplay = () => setAutoplayPause(true);
  const pauseAutoplay = () => setAutoplayPause(false);
  return { resumeAutoplay, pauseAutoplay };
}
export const SliderMask = React.forwardRef(function SliderMask(
  { className = "", children, ...props },
  ref
) {
  const { setSlideAmount } = React.useContext(SliderContext);
  const [isHovered, setHovered] = React.useState(false);
  const [slides, setSlides] = React.useState([]);
  const { resumeAutoplay, pauseAutoplay } = useAutoplay();
  React.useEffect(() => {
    const extractNonFragmentChildren = (_children) => {
      const childrenList = React.Children.toArray(_children).filter((child) =>
        React.isValidElement(child)
      );
      if (
        childrenList.length === 1 &&
        childrenList[0]?.type === React.Fragment
      ) {
        return extractNonFragmentChildren(childrenList[0].props.children);
      } else {
        return childrenList;
      }
    };
    const _slides = extractNonFragmentChildren(children);
    setSlideAmount(_slides.length);
    setSlides(_slides);
  }, [children]);
  return (
    <div
      {...props}
      className={cj(className, "w-slider-mask")}
      onMouseEnter={() => {
        pauseAutoplay();
        setHovered(true);
      }}
      onMouseLeave={() => {
        resumeAutoplay();
        setHovered(false);
      }}
      onFocus={() => pauseAutoplay()}
      onBlur={() => resumeAutoplay()}
      ref={ref}
    >
      {slides.map((child, index) => {
        return React.cloneElement(child, {
          ...child.props,
          index,
        });
      })}
      <div
        aria-live={isHovered ? "polite" : "off"}
        aria-atomic="true"
        className="w-slider-aria-label"
      />
    </div>
  );
});
export const SliderSlide = React.forwardRef(function SliderSlide(
  { tag = "div", className = "", style = {}, index, ...props },
  ref
) {
  const {
    animation,
    duration,
    easing,
    slide: { current, previous },
    slideAmount,
  } = React.useContext(SliderContext);
  const { restartEngine } = React.useContext(IXContext);
  React.useEffect(() => {
    restartEngine && restartEngine();
  }, [restartEngine]);
  const isSlideActive = current === index;
  const isSlidePrevious = previous === index;
  const animationStyle = React.useMemo(() => {
    const base = {
      transform: `translateX(-${current * 100}%)`,
      transition: `transform ${duration}ms ${EASING_FUNCTIONS[easing]} 0s`,
    };
    if (animation === "slide") {
      return base;
    }
    if (animation === "cross") {
      return {
        ...base,
        opacity: isSlideActive ? 1 : 0,
        transition: `opacity ${duration}ms ${
          EASING_FUNCTIONS[easing]
        } 0s, transform 1ms linear ${isSlideActive ? 0 : duration}ms`,
      };
    }
    if (animation === "outin") {
      return {
        ...base,
        opacity: isSlideActive ? 1 : 0,
        transition: `opacity ${duration / 2}ms ${EASING_FUNCTIONS[easing]} ${
          isSlidePrevious ? 0 : duration / 2
        }ms, transform 1ms linear ${isSlidePrevious ? duration / 2 : 0}ms`,
      };
    }
    if (animation === "fade") {
      return {
        ...base,
        opacity: isSlideActive ? 1 : 0,
        transition: `opacity ${duration}ms ${
          EASING_FUNCTIONS[easing]
        } 0s, transform 1ms linear ${isSlideActive ? 0 : duration}ms`,
      };
    }
    if (animation === "over") {
      return {
        ...base,
        transition: `transform ${duration}ms ${EASING_FUNCTIONS[easing]} ${
          isSlidePrevious ? duration : 0
        }ms`,
        zIndex: isSlideActive ? 1 : 0,
      };
    }
    return base;
  }, [animation, duration, easing, current, isSlideActive, isSlidePrevious]);
  const innerRef = React.useCallback(
    (node) => {
      triggerIXEvent(node, isSlideActive);
      if (ref) {
        if (typeof ref === "function") {
          ref(node);
        } else {
          ref.current = node;
        }
      }
    },
    [isSlideActive, ref]
  );
  return React.createElement(tag, {
    ...props,
    className: cj(className, "w-slide"),
    style: { ...style, ...animationStyle },
    "aria-label": `${index + 1} of ${slideAmount}`,
    role: "group",
    ref: innerRef,
    "aria-hidden": !isSlideActive ? "true" : "false",
  });
});
export const SliderArrow = React.forwardRef(function SliderArrow(
  { className = "", dir = "left", children, ...props },
  ref
) {
  const {
    goToNextSlide,
    goToPreviousSlide,
    hideArrows,
    slideAmount,
    slide: { current },
  } = React.useContext(SliderContext);
  const handleSlideChange = debounce(() => {
    if (dir === "left") {
      goToPreviousSlide();
    } else {
      goToNextSlide();
    }
  });
  const isHidden = React.useMemo(() => {
    if (dir === "left" && hideArrows && current === 0) return true;
    if (dir === "right" && hideArrows && current === slideAmount - 1)
      return true;
    return false;
  }, [dir, hideArrows, current, slideAmount]);
  return (
    <div
      {...props}
      onClick={handleSlideChange}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === KEY_CODES.ENTER || e.key === KEY_CODES.SPACE) {
          e.preventDefault();
          handleSlideChange();
        }
      }}
      role="button"
      tabIndex={0}
      className={cj(className, `w-slider-arrow-${dir}`)}
      aria-label={`${dir === "left" ? "previous" : "next"} slide`}
      style={{ display: isHidden ? "none" : "block" }}
      ref={ref}
    >
      {children}
    </div>
  );
});
export const SliderNav = React.forwardRef(function SliderNav(
  { className = "", ...props },
  ref
) {
  const {
    slideAmount,
    navInvert,
    navNumbers,
    navRound,
    navShadow,
    setAutoplayPause,
    setCurrentSlide,
  } = React.useContext(SliderContext);
  const [focusedDot, setFocusedDot] = React.useState(null);
  const handleFocus = (e) => {
    switch (e.key) {
      case KEY_CODES.ENTER:
      case KEY_CODES.SPACE: {
        e.preventDefault();
        if (focusedDot !== null) {
          setCurrentSlide(focusedDot);
        }
        break;
      }
      case KEY_CODES.ARROW_LEFT:
      case KEY_CODES.ARROW_UP: {
        e.preventDefault();
        setFocusedDot((prev) => Math.max((prev ?? 0) - 1, 0));
        break;
      }
      case KEY_CODES.ARROW_RIGHT:
      case KEY_CODES.ARROW_DOWN: {
        e.preventDefault();
        setFocusedDot((prev) => Math.min((prev ?? 0) + 1, slideAmount - 1));
        break;
      }
      case KEY_CODES.HOME: {
        e.preventDefault();
        setFocusedDot(0);
        break;
      }
      case KEY_CODES.END: {
        e.preventDefault();
        setFocusedDot(slideAmount - 1);
        break;
      }
      default: {
        return;
      }
    }
  };
  const dots = [...Array(slideAmount).keys()].map((_, i) => {
    return (
      <SliderDot
        key={i}
        index={i}
        focusedDot={focusedDot}
        handleFocus={handleFocus}
        setFocusedDot={setFocusedDot}
      />
    );
  });
  return (
    <div
      {...props}
      onFocus={(e) => {
        e.stopPropagation();
        setAutoplayPause(true);
      }}
      onBlur={() => {
        setAutoplayPause(false);
      }}
      onMouseLeave={(e) => e.stopPropagation()}
      className={cj(
        className,
        `w-slider-nav ${navInvert ? "w-slider-nav-invert" : ""} ${
          navShadow ? "w-shadow" : ""
        } ${navRound ? "w-round" : ""} ${navNumbers ? "w-num" : ""}`
      )}
      ref={ref}
    >
      {dots}
    </div>
  );
});
const SliderDot = React.forwardRef(function SliderDot(
  { index, focusedDot, handleFocus, setFocusedDot },
  ref
) {
  const {
    slideAmount,
    navSpacing,
    navNumbers,
    slide: { current: selectedSlide },
    setCurrentSlide,
  } = React.useContext(SliderContext);
  const innerRef = React.useRef(null);
  React.useImperativeHandle(ref, () => innerRef.current);
  React.useEffect(() => {
    if (focusedDot === index) {
      innerRef.current?.focus();
    }
  }, [focusedDot, index]);
  const isSlideActive = selectedSlide === index;
  const label = navNumbers ? index + 1 : "";
  return (
    <div
      className={`w-slider-dot ${isSlideActive ? "w-active" : ""}`}
      aria-label={`Show slide ${index + 1} of ${slideAmount}`}
      aria-pressed={isSlideActive}
      role="button"
      tabIndex={isSlideActive ? 0 : -1}
      style={{
        marginRight: `${navSpacing}px`,
        marginLeft: `${navSpacing}px`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        setFocusedDot(index);
        setCurrentSlide(index);
      }}
      ref={innerRef}
      onKeyDown={handleFocus}
    >
      {label}
    </div>
  );
});
