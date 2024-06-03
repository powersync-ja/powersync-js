import * as React from "react";
import {
  EASING_FUNCTIONS,
  KEY_CODES,
  cj,
  debounce,
  extractElement,
  isServer,
  useLayoutEffect,
  useResizeObserver,
} from "../utils";
import { Link, Container } from "./Basic";
const BREAKPOINTS = {
  medium: 991,
  small: 767,
  tiny: 479,
};
function getLinksList(root) {
  return root.querySelectorAll(".w-nav-menu .w-nav-link");
}
export const NavbarContext = React.createContext({
  animDirect: 1,
  animOver: false,
  animation: "animation",
  collapse: "medium",
  docHeight: false,
  duration: 400,
  easing2: "ease",
  easing: "ease",
  getBodyHeight: () => undefined,
  getOverlayHeight: () => {
    return undefined;
  },
  isOpen: false,
  noScroll: false,
  toggleOpen: () => undefined,
  navbarMounted: false,
  menu: undefined,
  root: undefined,
  setFocusedLink: () => undefined,
});
function getAnimationKeyframes({ axis = "Y", start, end }) {
  const t = `translate${axis}`;
  return [{ transform: `${t}(${start}px)` }, { transform: `${t}(${end}px)` }];
}
export const NavbarWrapper = React.forwardRef(function NavbarWrapper(
  props,
  ref
) {
  const { animation, docHeight, easing, easing2, duration, noScroll } =
    props.config;
  const root = React.useRef(null);
  const menu = React.useRef(null);
  const animOver = /^over/.test(animation);
  const animDirect = /left$/.test(animation) ? -1 : 1;
  const [focusedLink, setFocusedLink] = React.useState(-1);
  React.useImperativeHandle(ref, () => root.current);
  const getBodyHeight = React.useCallback(() => {
    if (isServer) return;
    return docHeight
      ? document.documentElement.scrollHeight
      : document.body.scrollHeight;
  }, [docHeight]);
  const getOverlayHeight = React.useCallback(() => {
    if (isServer || !root.current) return;
    let height = getBodyHeight();
    if (!height) return;
    const style = getComputedStyle(root.current);
    if (!animOver && style.position !== "fixed") {
      height -= root.current.offsetHeight;
    }
    return height;
  }, [animOver, getBodyHeight]);
  const getOffsetHeight = React.useCallback(() => {
    if (!root.current || !menu.current) return 0;
    return root.current.offsetHeight + menu.current.offsetHeight;
  }, []);
  const [isOpen, setIsOpen] = React.useState(false);
  const toggleOpen = debounce(() => {
    if (!menu.current) return;
    if (isOpen) {
      const keyframes = animOver
        ? getAnimationKeyframes({
            axis: "X",
            start: 0,
            end: animDirect * menu.current.offsetWidth,
          })
        : getAnimationKeyframes({ start: 0, end: -getOffsetHeight() });
      const anim = menu.current.animate(keyframes, {
        easing: EASING_FUNCTIONS[easing2] ?? "ease",
        duration,
        fill: "forwards",
      });
      anim.onfinish = () => {
        setIsOpen(!isOpen);
      };
      return;
    }
    setFocusedLink(-1);
    setIsOpen(!isOpen);
  });
  useLayoutEffect(() => {
    if (!menu.current) return;
    if (isOpen) {
      const keyframes = animOver
        ? getAnimationKeyframes({
            axis: "X",
            start: animDirect * menu.current.offsetWidth,
            end: 0,
          })
        : getAnimationKeyframes({ start: -getOffsetHeight(), end: 0 });
      menu.current.animate(keyframes, {
        easing: EASING_FUNCTIONS[easing] ?? "ease",
        duration,
        fill: "forwards",
      });
    }
  }, [
    animDirect,
    animOver,
    duration,
    easing,
    getBodyHeight,
    getOffsetHeight,
    isOpen,
  ]);
  useLayoutEffect(() => {
    if (isOpen && noScroll) {
      document.body.style.overflowY = "hidden";
    } else {
      document.body.style.overflowY = "";
    }
    return () => {
      document.body.style.overflowY = "";
    };
  }, [isOpen, noScroll]);
  const closeOnResize = React.useCallback(() => setIsOpen(false), [setIsOpen]);
  useResizeObserver(root, closeOnResize, { onlyWidth: true });
  React.useEffect(() => {
    if (root.current) {
      const links = getLinksList(root.current);
      links[focusedLink ?? 0]?.focus();
    }
  }, [focusedLink]);
  return (
    <NavbarContext.Provider
      value={{
        ...props.config,
        root,
        menu,
        animOver,
        animDirect,
        getBodyHeight,
        getOverlayHeight,
        isOpen,
        toggleOpen,
        navbarMounted: true,
        setFocusedLink,
      }}
    >
      <Navbar {...props} />
    </NavbarContext.Provider>
  );
});
const maybeExtractChildMenu = (children, isOpen) => {
  if (!isOpen) return { childMenu: null, rest: children };
  const { extracted, tree } = extractElement(
    React.Children.toArray(children),
    NavbarMenu
  );
  return { childMenu: extracted, rest: tree };
};
function Navbar({ tag = "div", className = "", children, config, ...props }) {
  const { root, collapse, setFocusedLink } = React.useContext(NavbarContext);
  const [shouldExtractMenu, setShouldExtractMenu] = React.useState(true);
  const extractMenuCallback = React.useCallback(
    (entry) => {
      setShouldExtractMenu(entry.contentRect.width <= BREAKPOINTS[collapse]);
    },
    [setShouldExtractMenu]
  );
  const bodyRef = React.useRef(
    typeof document !== "undefined" ? document.body : null
  );
  useResizeObserver(bodyRef, extractMenuCallback);
  const { childMenu, rest } = React.useMemo(
    () => maybeExtractChildMenu(children, shouldExtractMenu),
    [children, shouldExtractMenu]
  );
  const handleFocus = (e) => {
    const linkList = root.current ? Array.from(getLinksList(root.current)) : [];
    const linkAmount = linkList.length;
    switch (e.key) {
      case KEY_CODES.ARROW_LEFT:
      case KEY_CODES.ARROW_UP: {
        e.preventDefault();
        setFocusedLink((prev) => Math.max(prev - 1, 0));
        break;
      }
      case KEY_CODES.ARROW_RIGHT:
      case KEY_CODES.ARROW_DOWN: {
        e.preventDefault();
        setFocusedLink((prev) => Math.min(prev + 1, linkAmount - 1));
        break;
      }
      case KEY_CODES.HOME: {
        e.preventDefault();
        setFocusedLink(0);
        break;
      }
      case KEY_CODES.END: {
        e.preventDefault();
        setFocusedLink(linkAmount - 1);
        break;
      }
      case KEY_CODES.TAB: {
        setTimeout(() => {
          setFocusedLink(
            linkList.findIndex((link) => link === document.activeElement)
          );
        }, 0);
        break;
      }
      case KEY_CODES.SPACE: {
        e.preventDefault();
        break;
      }
      default: {
        return;
      }
    }
  };
  return React.createElement(
    tag,
    {
      ...props,
      className: cj(className, "w-nav"),
      "data-collapse": config.collapse,
      "data-animation": config.animation,
      ref: root,
      onKeyDown: handleFocus,
    },
    <>
      {rest}

      <NavbarOverlay>{childMenu}</NavbarOverlay>
    </>
  );
}
function NavbarOverlay({ children }) {
  const { isOpen, getOverlayHeight, toggleOpen } =
    React.useContext(NavbarContext);
  const overlayToggleOpen = React.useCallback(
    (e) => {
      if (e.target === e.currentTarget) {
        toggleOpen();
      }
    },
    [toggleOpen]
  );
  const overlayHeight = getOverlayHeight();
  return (
    <div
      className="w-nav-overlay"
      id="w-nav-overlay"
      style={{
        display: isOpen ? "block" : "none",
        height: overlayHeight ? overlayHeight : undefined,
        width: isOpen ? "100%" : 0,
      }}
      onClick={overlayToggleOpen}
      onKeyDown={overlayToggleOpen}
    >
      {children}
    </div>
  );
}
export const NavbarContainer = React.forwardRef(function NavbarContainer(
  { children, ...props },
  ref
) {
  const innerRef = React.useRef(null);
  const { isOpen } = React.useContext(NavbarContext);
  React.useImperativeHandle(ref, () => innerRef.current);
  const updateLinkStyles = React.useCallback(
    (entry) => {
      const { maxWidth: containerMaxWidth } = getComputedStyle(entry.target);
      document
        .querySelectorAll(".w-nav-menu>.w-dropdown,.w-nav-menu>.w-nav-link")
        .forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (!isOpen) {
            node.style.maxWidth = "";
            return;
          }
          const { maxWidth } = getComputedStyle(node);
          node.style.maxWidth =
            !maxWidth || maxWidth === "none" || maxWidth === containerMaxWidth
              ? containerMaxWidth
              : "";
        });
    },
    [isOpen]
  );
  useResizeObserver(innerRef, updateLinkStyles);
  return (
    <Container {...props} ref={innerRef}>
      {children}
    </Container>
  );
});
export const NavbarBrand = React.forwardRef(function NavbarBrand(
  { className = "", ...props },
  ref
) {
  return <Link {...props} className={cj(className, "w-nav-brand")} ref={ref} />;
});
export const NavbarMenu = React.forwardRef(function NavbarMenu(
  { tag = "nav", className = "", ...props },
  ref
) {
  const { getBodyHeight, animOver, isOpen, menu } =
    React.useContext(NavbarContext);
  React.useImperativeHandle(ref, () => menu.current);
  return React.createElement(tag, {
    ...props,
    className: cj(className, "w-nav-menu"),
    ...(isOpen ? { "data-nav-menu-open": "" } : {}),
    style: animOver ? { height: getBodyHeight() } : {},
    ref: menu,
  });
});
export const NavbarLink = React.forwardRef(function NavbarLink(
  { className = "", ...props },
  ref
) {
  const { isOpen } = React.useContext(NavbarContext);
  return (
    <Link
      {...props}
      className={cj(className, "w-nav-link", isOpen && "w--nav-link-open")}
      ref={ref}
    />
  );
});
export const NavbarButton = React.forwardRef(function NavbarButton(
  { tag = "div", className = "", ...props },
  ref
) {
  const { isOpen, toggleOpen } = React.useContext(NavbarContext);
  return React.createElement(tag, {
    ...props,
    "aria-label": "menu",
    "aria-expanded": isOpen ? "true" : "false",
    "aria-haspopup": "menu",
    "aria-controls": "w-nav-overlay",
    role: "button",
    tabIndex: 0,
    className: cj(className, "w-nav-button", isOpen && "w--open"),
    onClick: toggleOpen,
    onKeyDown: (e) => {
      if (e.key === KEY_CODES.ENTER || e.key === KEY_CODES.SPACE) {
        e.preventDefault();
        toggleOpen();
      }
    },
    ref,
  });
});
