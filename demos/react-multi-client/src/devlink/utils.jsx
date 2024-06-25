import * as React from "react";
export const cx = (style, ...classNames) =>
  cj(...classNames.map((c) => style[c] ?? c));
export const cj = (...classNames) => classNames.filter(Boolean).join(" ");
const UNESCAPED_CHARS = /(\\b|\\f|\\r\\n|\\n|\\r|\\t|\\v)/gm;
export const removeUnescaped = (value) =>
  decodeURIComponent(value).replace(UNESCAPED_CHARS, "");
const CSS_CLASS = /\.-?[_a-zA-Z]+[_a-zA-Z0-9-]*/g;
const WHITE_SPACE = /\s+/g;
export const replaceSelector = (selector, styles) => {
  return selector.replace(new RegExp(CSS_CLASS), (match) => {
    const segment = styles[match.replace(".", "")];
    if (!segment) return match;
    if (new RegExp(WHITE_SPACE).test(segment)) {
      const segmentSelector = segment
        .split(WHITE_SPACE)
        .map((w) => "." + w)
        .join(",");
      return `:is(${segmentSelector})`;
    }
    return `.${segment}`;
  });
};
export function debounce(func, timeout = 0) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, timeout);
  };
}
export const EASING_FUNCTIONS = {
  linear: "linear",
  ease: "ease",
  "ease-in": "ease-in",
  "ease-out": "ease--out",
  "ease-in-out": "ease-in-out",
  "ease-in-sine": "cubic-bezier(0.12, 0, 0.39, 0)",
  "ease-out-sine": "cubic-bezier(0.61, 1, 0.88, 1)",
  "ease-in-out-sine": "cubic-bezier(0.37, 0, 0.63, 1)",
  "ease-in-quad": "cubic-bezier(0.11, 0, 0.5, 0)",
  "ease-out-quad": "cubic-bezier(0.5, 1, 0.89, 1)",
  "ease-in-out-quad": "cubic-bezier(0.45, 0, 0.55, 1)",
  "ease-in-cubic": "cubic-bezier(0.32, 0, 0.67, 0)",
  "ease-out-cubic": "cubic-bezier(0.33, 1, 0.68, 1)",
  "ease-in-out-cubic": "cubic-bezier(0.65, 0, 0.35, 1)",
  "ease-in-quart": "cubic-bezier(0.5, 0, 0.75, 0)",
  "ease-out-quart": "cubic-bezier(0.25, 1, 0.5, 1)",
  "ease-in-out-quart": "cubic-bezier(0.76, 0, 0.24, 1)",
  "ease-in-quint": "cubic-bezier(0.64, 0, 0.78, 0)",
  "ease-out-quint": "cubic-bezier(0.22, 1, 0.36, 1)",
  "ease-in-out-quint": "cubic-bezier(0.83, 0, 0.17, 1)",
  "ease-in-expo": "cubic-bezier(0.7, 0, 0.84, 0)",
  "ease-out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
  "ease-in-out-expo": "cubic-bezier(0.87, 0, 0.13, 1)",
  "ease-in-circ": "cubic-bezier(0.55, 0, 1, 0.45)",
  "ease-out-circ": "cubic-bezier(0, 0.55, 0.45, 1)",
  "ease-in-out-circ": "cubic-bezier(0.85, 0, 0.15, 1)",
  "ease-in-back": "cubic-bezier(0.36, 0, 0.66, -0.56)",
  "ease-out-back": "cubic-bezier(0.34, 1.56, 0.64, 1)",
  "ease-in-out-back": "cubic-bezier(0.68, -0.6, 0.32, 1.6)",
};
export const isServer = typeof window === "undefined";
export const useLayoutEffect = isServer
  ? () => undefined
  : React.useLayoutEffect;
export function useResizeObserver(ref, fn, options) {
  const [prevWidth, setPrevWidth] = React.useState(
    ref.current?.clientWidth || 0
  );
  React.useEffect(() => {
    if (ref.current?.clientWidth) {
      setPrevWidth(ref.current.clientWidth);
    }
  }, [ref]);
  const observer = React.useMemo(
    () =>
      isServer
        ? null
        : new ResizeObserver(([entry]) => {
            if (options?.onlyWidth) {
              if (prevWidth !== entry.contentRect.width) {
                setPrevWidth(() => {
                  fn(entry);
                  return entry.contentRect.width;
                });
              }
            } else {
              fn(entry);
            }
          }),
    [fn, prevWidth, options?.onlyWidth]
  );
  React.useEffect(() => {
    const target = ref.current;
    if (!target) return;
    observer?.observe(ref.current);
    return () => observer?.unobserve(target);
  }, [ref, observer]);
}
export function isUrl(str) {
  if (!str) {
    return false;
  }
  if (str.indexOf('"') >= 0 || str.indexOf("'") >= 0) {
    return false;
  }
  return /((http|https):\/\/)?[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:/~+#-]*[\w@?^=%&amp;/~+#-])?/i.test(
    str.trim()
  );
}
function isScriptPresent(regex) {
  return Array.from(document.scripts).reduce(
    (isPresent, script) => (isPresent ? isPresent : regex.test(script.src)),
    false
  );
}
export function loadScript(src, options) {
  return new Promise((resolve, reject) => {
    try {
      const {
        async = true,
        type = "text/javascript",
        defer = true,
        cacheRegex,
      } = options ?? {};
      if (!src)
        return reject({
          loaded: false,
          error: true,
          message: "No src provided",
        });
      if (cacheRegex && isScriptPresent(cacheRegex))
        return resolve({ loaded: true, error: false });
      const tag = document.createElement("script");
      const container = document.head || document.body;
      tag.type = type;
      tag.async = async;
      tag.src = src;
      tag.defer = defer;
      tag.addEventListener("load", () => {
        resolve({ loaded: true, error: false });
      });
      tag.addEventListener("error", () => {
        reject({
          loaded: false,
          error: true,
          message: `Failed to load script with src ${src}`,
        });
      });
      container.appendChild(tag);
    } catch (error) {
      reject(error);
    }
  });
}
export const KEY_CODES = {
  ARROW_LEFT: "ArrowLeft",
  ARROW_UP: "ArrowUp",
  ARROW_RIGHT: "ArrowRight",
  ARROW_DOWN: "ArrowDown",
  SPACE: " ",
  ENTER: "Enter",
  HOME: "Home",
  END: "End",
  TAB: "Tab",
};
export function dispatchCustomEvent(element, eventName) {
  element.dispatchEvent(
    new CustomEvent(eventName, {
      bubbles: true,
      cancelable: true,
    })
  );
}
export function useClickOut(ref, action) {
  React.useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current?.contains(event.target)) return;
      action();
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, action]);
}
export function extractElement(elements, type) {
  let extracted;
  function removeElementByType(_elements) {
    return _elements.map((element) => {
      if (!React.isValidElement(element)) {
        return element;
      }
      if (element.type === type) {
        extracted = element;
        return null;
      }
      const children = removeElementByType(
        React.Children.toArray(element.props.children)
      );
      return React.cloneElement(element, element.props, ...children);
    });
  }
  const tree = removeElementByType(elements);
  return { extracted, tree };
}
