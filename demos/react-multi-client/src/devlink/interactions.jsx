import * as React from "react";
import {
  debounce,
  dispatchCustomEvent,
  replaceSelector,
  useLayoutEffect,
} from "./utils";
const enhanceIXData = (data, styles) => {
  const newIXData = structuredClone(data);
  for (const id in newIXData.events) {
    const { target, targets } = newIXData.events[id];
    for (const t of [target, ...targets]) {
      if (t.appliesTo !== "CLASS") continue;
      t.selector = replaceSelector(t.selector, styles);
    }
  }
  for (const id in newIXData.actionLists) {
    const { actionItemGroups, continuousParameterGroups } =
      newIXData.actionLists[id];
    if (actionItemGroups) {
      for (const { actionItems } of actionItemGroups) {
        for (const { config } of actionItems) {
          const { selector } = config.target;
          if (!selector) continue;
          config.target.selector = replaceSelector(selector, styles);
        }
      }
    }
    if (continuousParameterGroups) {
      for (const group of continuousParameterGroups) {
        for (const { actionItems } of group.continuousActionGroups) {
          for (const { config } of actionItems) {
            const { selector } = config.target;
            if (!selector) continue;
            config.target.selector = replaceSelector(selector, styles);
          }
        }
      }
    }
  }
  return newIXData;
};
export const IXContext = React.createContext({
  initEngine: null,
  restartEngine: null,
});
export const InteractionsProvider = ({ children, createEngine }) => {
  const ixData = React.useRef({});
  const ixStyles = React.useRef();
  const ixEngine = React.useRef();
  const debouncedInit = React.useRef(
    debounce((data, styles) => {
      if (!ixEngine.current) ixEngine.current = createEngine();
      const newData = styles ? enhanceIXData(data, styles) : data;
      ixEngine.current.init(newData);
      dispatchCustomEvent(document, "IX2_PAGE_UPDATE");
    })
  );
  const initEngine = React.useCallback((data, styles) => {
    if (!ixData.current.site) {
      ixData.current.site = data.site;
    }
    ixData.current.events = {
      ...ixData.current.events,
      ...data.events,
    };
    ixData.current.actionLists = {
      ...ixData.current.actionLists,
      ...data.actionLists,
    };
    if (styles) {
      ixStyles.current = ixStyles.current ?? {};
      for (const s in styles) {
        if (!ixStyles.current[s]?.includes(styles[s])) {
          const currentStyle = ixStyles.current[s];
          ixStyles.current[s] =
            CSS.escape(styles[s]) + (currentStyle ? ` ${currentStyle}` : "");
        }
      }
    }
    debouncedInit.current(ixData.current, ixStyles.current);
  }, []);
  return (
    <IXContext.Provider
      value={{
        initEngine,
        restartEngine: () =>
          debouncedInit.current &&
          debouncedInit.current(ixData.current, ixStyles.current),
      }}
    >
      {children}
    </IXContext.Provider>
  );
};
export const useInteractions = (data, styles) => {
  const { initEngine } = React.useContext(IXContext);
  React.useEffect(() => {
    if (initEngine) initEngine(data, styles);
  }, [initEngine, data, styles]);
  React.useEffect(() => {
    if (document.querySelector("html")?.hasAttribute("data-wf-page")) return;
    const hasPageInteractions = Object.values(data.events).some(
      (event) => event.target.appliesTo === "PAGE"
    );
    if (hasPageInteractions) {
      document.documentElement.setAttribute("data-wf-page", "wf-page-id");
      dispatchCustomEvent(document, "IX2_PAGE_UPDATE");
    }
  }, [data.events]);
};
export function triggerIXEvent(element, active) {
  if (!element) return;
  dispatchCustomEvent(
    element,
    active ? "COMPONENT_ACTIVE" : "COMPONENT_INACTIVE"
  );
}
export function useIXEvent(element, active) {
  useLayoutEffect(() => {
    triggerIXEvent(element, active);
  }, [element, active]);
}
