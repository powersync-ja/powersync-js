/*!
 * Webflow: Front-end site library
 * @license MIT
 * Inline scripts may access the api using an async handler:
 *   var Webflow = Webflow || [];
 *   Webflow.push(readyFunction);
 */

var c = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports);
var lr = c((eq, mi) => {
  var Zp =
    typeof global == "object" && global && global.Object === Object && global;
  mi.exports = Zp;
});
var W = c((tq, Ni) => {
  var Jp = lr(),
    eE = typeof self == "object" && self && self.Object === Object && self,
    tE = Jp || eE || Function("return this")();
  Ni.exports = tE;
});
var _e = c((rq, Pi) => {
  var rE = W(),
    nE = rE.Symbol;
  Pi.exports = nE;
});
var Mi = c((nq, Di) => {
  var bi = _e(),
    Li = Object.prototype,
    iE = Li.hasOwnProperty,
    oE = Li.toString,
    xe = bi ? bi.toStringTag : void 0;
  function uE(e) {
    var t = iE.call(e, xe),
      r = e[xe];
    try {
      e[xe] = void 0;
      var n = !0;
    } catch {}
    var i = oE.call(e);
    return n && (t ? (e[xe] = r) : delete e[xe]), i;
  }
  Di.exports = uE;
});
var qi = c((iq, Fi) => {
  var aE = Object.prototype,
    sE = aE.toString;
  function cE(e) {
    return sE.call(e);
  }
  Fi.exports = cE;
});
var ee = c((oq, Gi) => {
  var wi = _e(),
    lE = Mi(),
    fE = qi(),
    dE = "[object Null]",
    pE = "[object Undefined]",
    xi = wi ? wi.toStringTag : void 0;
  function EE(e) {
    return e == null
      ? e === void 0
        ? pE
        : dE
      : xi && xi in Object(e)
      ? lE(e)
      : fE(e);
  }
  Gi.exports = EE;
});
var fr = c((uq, Vi) => {
  function _E(e, t) {
    return function (r) {
      return e(t(r));
    };
  }
  Vi.exports = _E;
});
var dr = c((aq, Xi) => {
  var gE = fr(),
    IE = gE(Object.getPrototypeOf, Object);
  Xi.exports = IE;
});
var $ = c((sq, Ui) => {
  function hE(e) {
    return e != null && typeof e == "object";
  }
  Ui.exports = hE;
});
var pr = c((cq, Wi) => {
  var TE = ee(),
    yE = dr(),
    OE = $(),
    vE = "[object Object]",
    AE = Function.prototype,
    SE = Object.prototype,
    Bi = AE.toString,
    CE = SE.hasOwnProperty,
    RE = Bi.call(Object);
  function mE(e) {
    if (!OE(e) || TE(e) != vE) return !1;
    var t = yE(e);
    if (t === null) return !0;
    var r = CE.call(t, "constructor") && t.constructor;
    return typeof r == "function" && r instanceof r && Bi.call(r) == RE;
  }
  Wi.exports = mE;
});
var Hi = c((Er) => {
  "use strict";
  Object.defineProperty(Er, "__esModule", { value: !0 });
  Er.default = NE;
  function NE(e) {
    var t,
      r = e.Symbol;
    return (
      typeof r == "function"
        ? r.observable
          ? (t = r.observable)
          : ((t = r("observable")), (r.observable = t))
        : (t = "@@observable"),
      t
    );
  }
});
var ji = c((gr, _r) => {
  "use strict";
  Object.defineProperty(gr, "__esModule", { value: !0 });
  var PE = Hi(),
    bE = LE(PE);
  function LE(e) {
    return e && e.__esModule ? e : { default: e };
  }
  var ge;
  typeof self < "u"
    ? (ge = self)
    : typeof window < "u"
    ? (ge = window)
    : typeof global < "u"
    ? (ge = global)
    : typeof _r < "u"
    ? (ge = _r)
    : (ge = Function("return this")());
  var DE = (0, bE.default)(ge);
  gr.default = DE;
});
var Ir = c((Ge) => {
  "use strict";
  Ge.__esModule = !0;
  Ge.ActionTypes = void 0;
  Ge.default = ki;
  var ME = pr(),
    FE = zi(ME),
    qE = ji(),
    Ki = zi(qE);
  function zi(e) {
    return e && e.__esModule ? e : { default: e };
  }
  var Yi = (Ge.ActionTypes = { INIT: "@@redux/INIT" });
  function ki(e, t, r) {
    var n;
    if (
      (typeof t == "function" && typeof r > "u" && ((r = t), (t = void 0)),
      typeof r < "u")
    ) {
      if (typeof r != "function")
        throw new Error("Expected the enhancer to be a function.");
      return r(ki)(e, t);
    }
    if (typeof e != "function")
      throw new Error("Expected the reducer to be a function.");
    var i = e,
      o = t,
      u = [],
      a = u,
      s = !1;
    function l() {
      a === u && (a = u.slice());
    }
    function d() {
      return o;
    }
    function p(_) {
      if (typeof _ != "function")
        throw new Error("Expected listener to be a function.");
      var h = !0;
      return (
        l(),
        a.push(_),
        function () {
          if (h) {
            (h = !1), l();
            var y = a.indexOf(_);
            a.splice(y, 1);
          }
        }
      );
    }
    function f(_) {
      if (!(0, FE.default)(_))
        throw new Error(
          "Actions must be plain objects. Use custom middleware for async actions."
        );
      if (typeof _.type > "u")
        throw new Error(
          'Actions may not have an undefined "type" property. Have you misspelled a constant?'
        );
      if (s) throw new Error("Reducers may not dispatch actions.");
      try {
        (s = !0), (o = i(o, _));
      } finally {
        s = !1;
      }
      for (var h = (u = a), I = 0; I < h.length; I++) h[I]();
      return _;
    }
    function E(_) {
      if (typeof _ != "function")
        throw new Error("Expected the nextReducer to be a function.");
      (i = _), f({ type: Yi.INIT });
    }
    function g() {
      var _,
        h = p;
      return (
        (_ = {
          subscribe: function (y) {
            if (typeof y != "object")
              throw new TypeError("Expected the observer to be an object.");
            function A() {
              y.next && y.next(d());
            }
            A();
            var O = h(A);
            return { unsubscribe: O };
          },
        }),
        (_[Ki.default] = function () {
          return this;
        }),
        _
      );
    }
    return (
      f({ type: Yi.INIT }),
      (n = { dispatch: f, subscribe: p, getState: d, replaceReducer: E }),
      (n[Ki.default] = g),
      n
    );
  }
});
var Tr = c((hr) => {
  "use strict";
  hr.__esModule = !0;
  hr.default = wE;
  function wE(e) {
    typeof console < "u" &&
      typeof console.error == "function" &&
      console.error(e);
    try {
      throw new Error(e);
    } catch {}
  }
});
var Zi = c((yr) => {
  "use strict";
  yr.__esModule = !0;
  yr.default = UE;
  var Qi = Ir(),
    xE = pr(),
    pq = $i(xE),
    GE = Tr(),
    Eq = $i(GE);
  function $i(e) {
    return e && e.__esModule ? e : { default: e };
  }
  function VE(e, t) {
    var r = t && t.type,
      n = (r && '"' + r.toString() + '"') || "an action";
    return (
      "Given action " +
      n +
      ', reducer "' +
      e +
      '" returned undefined. To ignore an action, you must explicitly return the previous state.'
    );
  }
  function XE(e) {
    Object.keys(e).forEach(function (t) {
      var r = e[t],
        n = r(void 0, { type: Qi.ActionTypes.INIT });
      if (typeof n > "u")
        throw new Error(
          'Reducer "' +
            t +
            '" returned undefined during initialization. If the state passed to the reducer is undefined, you must explicitly return the initial state. The initial state may not be undefined.'
        );
      var i =
        "@@redux/PROBE_UNKNOWN_ACTION_" +
        Math.random().toString(36).substring(7).split("").join(".");
      if (typeof r(void 0, { type: i }) > "u")
        throw new Error(
          'Reducer "' +
            t +
            '" returned undefined when probed with a random type. ' +
            ("Don't try to handle " +
              Qi.ActionTypes.INIT +
              ' or other actions in "redux/*" ') +
            "namespace. They are considered private. Instead, you must return the current state for any unknown actions, unless it is undefined, in which case you must return the initial state, regardless of the action type. The initial state may not be undefined."
        );
    });
  }
  function UE(e) {
    for (var t = Object.keys(e), r = {}, n = 0; n < t.length; n++) {
      var i = t[n];
      typeof e[i] == "function" && (r[i] = e[i]);
    }
    var o = Object.keys(r);
    if (!1) var u;
    var a;
    try {
      XE(r);
    } catch (s) {
      a = s;
    }
    return function () {
      var l =
          arguments.length <= 0 || arguments[0] === void 0 ? {} : arguments[0],
        d = arguments[1];
      if (a) throw a;
      if (!1) var p;
      for (var f = !1, E = {}, g = 0; g < o.length; g++) {
        var _ = o[g],
          h = r[_],
          I = l[_],
          y = h(I, d);
        if (typeof y > "u") {
          var A = VE(_, d);
          throw new Error(A);
        }
        (E[_] = y), (f = f || y !== I);
      }
      return f ? E : l;
    };
  }
});
var eo = c((Or) => {
  "use strict";
  Or.__esModule = !0;
  Or.default = BE;
  function Ji(e, t) {
    return function () {
      return t(e.apply(void 0, arguments));
    };
  }
  function BE(e, t) {
    if (typeof e == "function") return Ji(e, t);
    if (typeof e != "object" || e === null)
      throw new Error(
        "bindActionCreators expected an object or a function, instead received " +
          (e === null ? "null" : typeof e) +
          '. Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?'
      );
    for (var r = Object.keys(e), n = {}, i = 0; i < r.length; i++) {
      var o = r[i],
        u = e[o];
      typeof u == "function" && (n[o] = Ji(u, t));
    }
    return n;
  }
});
var Ar = c((vr) => {
  "use strict";
  vr.__esModule = !0;
  vr.default = WE;
  function WE() {
    for (var e = arguments.length, t = Array(e), r = 0; r < e; r++)
      t[r] = arguments[r];
    if (t.length === 0)
      return function (o) {
        return o;
      };
    if (t.length === 1) return t[0];
    var n = t[t.length - 1],
      i = t.slice(0, -1);
    return function () {
      return i.reduceRight(function (o, u) {
        return u(o);
      }, n.apply(void 0, arguments));
    };
  }
});
var to = c((Sr) => {
  "use strict";
  Sr.__esModule = !0;
  var HE =
    Object.assign ||
    function (e) {
      for (var t = 1; t < arguments.length; t++) {
        var r = arguments[t];
        for (var n in r)
          Object.prototype.hasOwnProperty.call(r, n) && (e[n] = r[n]);
      }
      return e;
    };
  Sr.default = zE;
  var jE = Ar(),
    KE = YE(jE);
  function YE(e) {
    return e && e.__esModule ? e : { default: e };
  }
  function zE() {
    for (var e = arguments.length, t = Array(e), r = 0; r < e; r++)
      t[r] = arguments[r];
    return function (n) {
      return function (i, o, u) {
        var a = n(i, o, u),
          s = a.dispatch,
          l = [],
          d = {
            getState: a.getState,
            dispatch: function (f) {
              return s(f);
            },
          };
        return (
          (l = t.map(function (p) {
            return p(d);
          })),
          (s = KE.default.apply(void 0, l)(a.dispatch)),
          HE({}, a, { dispatch: s })
        );
      };
    };
  }
});
var Cr = c((U) => {
  "use strict";
  U.__esModule = !0;
  U.compose =
    U.applyMiddleware =
    U.bindActionCreators =
    U.combineReducers =
    U.createStore =
      void 0;
  var kE = Ir(),
    QE = Ie(kE),
    $E = Zi(),
    ZE = Ie($E),
    JE = eo(),
    e_ = Ie(JE),
    t_ = to(),
    r_ = Ie(t_),
    n_ = Ar(),
    i_ = Ie(n_),
    o_ = Tr(),
    Tq = Ie(o_);
  function Ie(e) {
    return e && e.__esModule ? e : { default: e };
  }
  U.createStore = QE.default;
  U.combineReducers = ZE.default;
  U.bindActionCreators = e_.default;
  U.applyMiddleware = r_.default;
  U.compose = i_.default;
});
var ro = c((Rr) => {
  "use strict";
  Object.defineProperty(Rr, "__esModule", { value: !0 });
  function u_(e, t) {
    for (var r in t) Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
  }
  u_(Rr, {
    EventAppliesTo: function () {
      return s_;
    },
    EventBasedOn: function () {
      return c_;
    },
    EventContinuousMouseAxes: function () {
      return l_;
    },
    EventLimitAffectedElements: function () {
      return f_;
    },
    EventTypeConsts: function () {
      return a_;
    },
    QuickEffectDirectionConsts: function () {
      return p_;
    },
    QuickEffectIds: function () {
      return d_;
    },
  });
  var a_ = {
      NAVBAR_OPEN: "NAVBAR_OPEN",
      NAVBAR_CLOSE: "NAVBAR_CLOSE",
      TAB_ACTIVE: "TAB_ACTIVE",
      TAB_INACTIVE: "TAB_INACTIVE",
      SLIDER_ACTIVE: "SLIDER_ACTIVE",
      SLIDER_INACTIVE: "SLIDER_INACTIVE",
      DROPDOWN_OPEN: "DROPDOWN_OPEN",
      DROPDOWN_CLOSE: "DROPDOWN_CLOSE",
      MOUSE_CLICK: "MOUSE_CLICK",
      MOUSE_SECOND_CLICK: "MOUSE_SECOND_CLICK",
      MOUSE_DOWN: "MOUSE_DOWN",
      MOUSE_UP: "MOUSE_UP",
      MOUSE_OVER: "MOUSE_OVER",
      MOUSE_OUT: "MOUSE_OUT",
      MOUSE_MOVE: "MOUSE_MOVE",
      MOUSE_MOVE_IN_VIEWPORT: "MOUSE_MOVE_IN_VIEWPORT",
      SCROLL_INTO_VIEW: "SCROLL_INTO_VIEW",
      SCROLL_OUT_OF_VIEW: "SCROLL_OUT_OF_VIEW",
      SCROLLING_IN_VIEW: "SCROLLING_IN_VIEW",
      ECOMMERCE_CART_OPEN: "ECOMMERCE_CART_OPEN",
      ECOMMERCE_CART_CLOSE: "ECOMMERCE_CART_CLOSE",
      PAGE_START: "PAGE_START",
      PAGE_FINISH: "PAGE_FINISH",
      PAGE_SCROLL_UP: "PAGE_SCROLL_UP",
      PAGE_SCROLL_DOWN: "PAGE_SCROLL_DOWN",
      PAGE_SCROLL: "PAGE_SCROLL",
    },
    s_ = { ELEMENT: "ELEMENT", CLASS: "CLASS", PAGE: "PAGE" },
    c_ = { ELEMENT: "ELEMENT", VIEWPORT: "VIEWPORT" },
    l_ = { X_AXIS: "X_AXIS", Y_AXIS: "Y_AXIS" },
    f_ = {
      CHILDREN: "CHILDREN",
      SIBLINGS: "SIBLINGS",
      IMMEDIATE_CHILDREN: "IMMEDIATE_CHILDREN",
    },
    d_ = {
      FADE_EFFECT: "FADE_EFFECT",
      SLIDE_EFFECT: "SLIDE_EFFECT",
      GROW_EFFECT: "GROW_EFFECT",
      SHRINK_EFFECT: "SHRINK_EFFECT",
      SPIN_EFFECT: "SPIN_EFFECT",
      FLY_EFFECT: "FLY_EFFECT",
      POP_EFFECT: "POP_EFFECT",
      FLIP_EFFECT: "FLIP_EFFECT",
      JIGGLE_EFFECT: "JIGGLE_EFFECT",
      PULSE_EFFECT: "PULSE_EFFECT",
      DROP_EFFECT: "DROP_EFFECT",
      BLINK_EFFECT: "BLINK_EFFECT",
      BOUNCE_EFFECT: "BOUNCE_EFFECT",
      FLIP_LEFT_TO_RIGHT_EFFECT: "FLIP_LEFT_TO_RIGHT_EFFECT",
      FLIP_RIGHT_TO_LEFT_EFFECT: "FLIP_RIGHT_TO_LEFT_EFFECT",
      RUBBER_BAND_EFFECT: "RUBBER_BAND_EFFECT",
      JELLO_EFFECT: "JELLO_EFFECT",
      GROW_BIG_EFFECT: "GROW_BIG_EFFECT",
      SHRINK_BIG_EFFECT: "SHRINK_BIG_EFFECT",
      PLUGIN_LOTTIE_EFFECT: "PLUGIN_LOTTIE_EFFECT",
    },
    p_ = {
      LEFT: "LEFT",
      RIGHT: "RIGHT",
      BOTTOM: "BOTTOM",
      TOP: "TOP",
      BOTTOM_LEFT: "BOTTOM_LEFT",
      BOTTOM_RIGHT: "BOTTOM_RIGHT",
      TOP_RIGHT: "TOP_RIGHT",
      TOP_LEFT: "TOP_LEFT",
      CLOCKWISE: "CLOCKWISE",
      COUNTER_CLOCKWISE: "COUNTER_CLOCKWISE",
    };
});
var Nr = c((mr) => {
  "use strict";
  Object.defineProperty(mr, "__esModule", { value: !0 });
  function E_(e, t) {
    for (var r in t) Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
  }
  E_(mr, {
    ActionAppliesTo: function () {
      return g_;
    },
    ActionTypeConsts: function () {
      return __;
    },
  });
  var __ = {
      TRANSFORM_MOVE: "TRANSFORM_MOVE",
      TRANSFORM_SCALE: "TRANSFORM_SCALE",
      TRANSFORM_ROTATE: "TRANSFORM_ROTATE",
      TRANSFORM_SKEW: "TRANSFORM_SKEW",
      STYLE_OPACITY: "STYLE_OPACITY",
      STYLE_SIZE: "STYLE_SIZE",
      STYLE_FILTER: "STYLE_FILTER",
      STYLE_FONT_VARIATION: "STYLE_FONT_VARIATION",
      STYLE_BACKGROUND_COLOR: "STYLE_BACKGROUND_COLOR",
      STYLE_BORDER: "STYLE_BORDER",
      STYLE_TEXT_COLOR: "STYLE_TEXT_COLOR",
      OBJECT_VALUE: "OBJECT_VALUE",
      PLUGIN_LOTTIE: "PLUGIN_LOTTIE",
      PLUGIN_SPLINE: "PLUGIN_SPLINE",
      PLUGIN_RIVE: "PLUGIN_RIVE",
      PLUGIN_VARIABLE: "PLUGIN_VARIABLE",
      GENERAL_DISPLAY: "GENERAL_DISPLAY",
      GENERAL_START_ACTION: "GENERAL_START_ACTION",
      GENERAL_CONTINUOUS_ACTION: "GENERAL_CONTINUOUS_ACTION",
      GENERAL_COMBO_CLASS: "GENERAL_COMBO_CLASS",
      GENERAL_STOP_ACTION: "GENERAL_STOP_ACTION",
      GENERAL_LOOP: "GENERAL_LOOP",
      STYLE_BOX_SHADOW: "STYLE_BOX_SHADOW",
    },
    g_ = {
      ELEMENT: "ELEMENT",
      ELEMENT_CLASS: "ELEMENT_CLASS",
      TRIGGER_ELEMENT: "TRIGGER_ELEMENT",
    };
});
var no = c((Pr) => {
  "use strict";
  Object.defineProperty(Pr, "__esModule", { value: !0 });
  Object.defineProperty(Pr, "InteractionTypeConsts", {
    enumerable: !0,
    get: function () {
      return I_;
    },
  });
  var I_ = {
    MOUSE_CLICK_INTERACTION: "MOUSE_CLICK_INTERACTION",
    MOUSE_HOVER_INTERACTION: "MOUSE_HOVER_INTERACTION",
    MOUSE_MOVE_INTERACTION: "MOUSE_MOVE_INTERACTION",
    SCROLL_INTO_VIEW_INTERACTION: "SCROLL_INTO_VIEW_INTERACTION",
    SCROLLING_IN_VIEW_INTERACTION: "SCROLLING_IN_VIEW_INTERACTION",
    MOUSE_MOVE_IN_VIEWPORT_INTERACTION: "MOUSE_MOVE_IN_VIEWPORT_INTERACTION",
    PAGE_IS_SCROLLING_INTERACTION: "PAGE_IS_SCROLLING_INTERACTION",
    PAGE_LOAD_INTERACTION: "PAGE_LOAD_INTERACTION",
    PAGE_SCROLLED_INTERACTION: "PAGE_SCROLLED_INTERACTION",
    NAVBAR_INTERACTION: "NAVBAR_INTERACTION",
    DROPDOWN_INTERACTION: "DROPDOWN_INTERACTION",
    ECOMMERCE_CART_INTERACTION: "ECOMMERCE_CART_INTERACTION",
    TAB_INTERACTION: "TAB_INTERACTION",
    SLIDER_INTERACTION: "SLIDER_INTERACTION",
  };
});
var io = c((br) => {
  "use strict";
  Object.defineProperty(br, "__esModule", { value: !0 });
  Object.defineProperty(br, "ReducedMotionTypes", {
    enumerable: !0,
    get: function () {
      return R_;
    },
  });
  var h_ = Nr(),
    {
      TRANSFORM_MOVE: T_,
      TRANSFORM_SCALE: y_,
      TRANSFORM_ROTATE: O_,
      TRANSFORM_SKEW: v_,
      STYLE_SIZE: A_,
      STYLE_FILTER: S_,
      STYLE_FONT_VARIATION: C_,
    } = h_.ActionTypeConsts,
    R_ = {
      [T_]: !0,
      [y_]: !0,
      [O_]: !0,
      [v_]: !0,
      [A_]: !0,
      [S_]: !0,
      [C_]: !0,
    };
});
var oo = c((Lr) => {
  "use strict";
  Object.defineProperty(Lr, "__esModule", { value: !0 });
  function m_(e, t) {
    for (var r in t) Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
  }
  m_(Lr, {
    IX2_ACTION_LIST_PLAYBACK_CHANGED: function () {
      return H_;
    },
    IX2_ANIMATION_FRAME_CHANGED: function () {
      return G_;
    },
    IX2_CLEAR_REQUESTED: function () {
      return q_;
    },
    IX2_ELEMENT_STATE_CHANGED: function () {
      return W_;
    },
    IX2_EVENT_LISTENER_ADDED: function () {
      return w_;
    },
    IX2_EVENT_STATE_CHANGED: function () {
      return x_;
    },
    IX2_INSTANCE_ADDED: function () {
      return X_;
    },
    IX2_INSTANCE_REMOVED: function () {
      return B_;
    },
    IX2_INSTANCE_STARTED: function () {
      return U_;
    },
    IX2_MEDIA_QUERIES_DEFINED: function () {
      return K_;
    },
    IX2_PARAMETER_CHANGED: function () {
      return V_;
    },
    IX2_PLAYBACK_REQUESTED: function () {
      return M_;
    },
    IX2_PREVIEW_REQUESTED: function () {
      return D_;
    },
    IX2_RAW_DATA_IMPORTED: function () {
      return N_;
    },
    IX2_SESSION_INITIALIZED: function () {
      return P_;
    },
    IX2_SESSION_STARTED: function () {
      return b_;
    },
    IX2_SESSION_STOPPED: function () {
      return L_;
    },
    IX2_STOP_REQUESTED: function () {
      return F_;
    },
    IX2_TEST_FRAME_RENDERED: function () {
      return Y_;
    },
    IX2_VIEWPORT_WIDTH_CHANGED: function () {
      return j_;
    },
  });
  var N_ = "IX2_RAW_DATA_IMPORTED",
    P_ = "IX2_SESSION_INITIALIZED",
    b_ = "IX2_SESSION_STARTED",
    L_ = "IX2_SESSION_STOPPED",
    D_ = "IX2_PREVIEW_REQUESTED",
    M_ = "IX2_PLAYBACK_REQUESTED",
    F_ = "IX2_STOP_REQUESTED",
    q_ = "IX2_CLEAR_REQUESTED",
    w_ = "IX2_EVENT_LISTENER_ADDED",
    x_ = "IX2_EVENT_STATE_CHANGED",
    G_ = "IX2_ANIMATION_FRAME_CHANGED",
    V_ = "IX2_PARAMETER_CHANGED",
    X_ = "IX2_INSTANCE_ADDED",
    U_ = "IX2_INSTANCE_STARTED",
    B_ = "IX2_INSTANCE_REMOVED",
    W_ = "IX2_ELEMENT_STATE_CHANGED",
    H_ = "IX2_ACTION_LIST_PLAYBACK_CHANGED",
    j_ = "IX2_VIEWPORT_WIDTH_CHANGED",
    K_ = "IX2_MEDIA_QUERIES_DEFINED",
    Y_ = "IX2_TEST_FRAME_RENDERED";
});
var uo = c((Dr) => {
  "use strict";
  Object.defineProperty(Dr, "__esModule", { value: !0 });
  function z_(e, t) {
    for (var r in t) Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
  }
  z_(Dr, {
    ABSTRACT_NODE: function () {
      return Kg;
    },
    AUTO: function () {
      return qg;
    },
    BACKGROUND: function () {
      return Pg;
    },
    BACKGROUND_COLOR: function () {
      return Ng;
    },
    BAR_DELIMITER: function () {
      return Gg;
    },
    BORDER_COLOR: function () {
      return bg;
    },
    BOUNDARY_SELECTOR: function () {
      return J_;
    },
    CHILDREN: function () {
      return Vg;
    },
    COLON_DELIMITER: function () {
      return xg;
    },
    COLOR: function () {
      return Lg;
    },
    COMMA_DELIMITER: function () {
      return wg;
    },
    CONFIG_UNIT: function () {
      return ag;
    },
    CONFIG_VALUE: function () {
      return ng;
    },
    CONFIG_X_UNIT: function () {
      return ig;
    },
    CONFIG_X_VALUE: function () {
      return eg;
    },
    CONFIG_Y_UNIT: function () {
      return og;
    },
    CONFIG_Y_VALUE: function () {
      return tg;
    },
    CONFIG_Z_UNIT: function () {
      return ug;
    },
    CONFIG_Z_VALUE: function () {
      return rg;
    },
    DISPLAY: function () {
      return Dg;
    },
    FILTER: function () {
      return Sg;
    },
    FLEX: function () {
      return Mg;
    },
    FONT_VARIATION_SETTINGS: function () {
      return Cg;
    },
    HEIGHT: function () {
      return mg;
    },
    HTML_ELEMENT: function () {
      return Hg;
    },
    IMMEDIATE_CHILDREN: function () {
      return Xg;
    },
    IX2_ID_DELIMITER: function () {
      return k_;
    },
    OPACITY: function () {
      return Ag;
    },
    PARENT: function () {
      return Bg;
    },
    PLAIN_OBJECT: function () {
      return jg;
    },
    PRESERVE_3D: function () {
      return Wg;
    },
    RENDER_GENERAL: function () {
      return zg;
    },
    RENDER_PLUGIN: function () {
      return Qg;
    },
    RENDER_STYLE: function () {
      return kg;
    },
    RENDER_TRANSFORM: function () {
      return Yg;
    },
    ROTATE_X: function () {
      return Ig;
    },
    ROTATE_Y: function () {
      return hg;
    },
    ROTATE_Z: function () {
      return Tg;
    },
    SCALE_3D: function () {
      return gg;
    },
    SCALE_X: function () {
      return pg;
    },
    SCALE_Y: function () {
      return Eg;
    },
    SCALE_Z: function () {
      return _g;
    },
    SIBLINGS: function () {
      return Ug;
    },
    SKEW: function () {
      return yg;
    },
    SKEW_X: function () {
      return Og;
    },
    SKEW_Y: function () {
      return vg;
    },
    TRANSFORM: function () {
      return sg;
    },
    TRANSLATE_3D: function () {
      return dg;
    },
    TRANSLATE_X: function () {
      return cg;
    },
    TRANSLATE_Y: function () {
      return lg;
    },
    TRANSLATE_Z: function () {
      return fg;
    },
    WF_PAGE: function () {
      return Q_;
    },
    WIDTH: function () {
      return Rg;
    },
    WILL_CHANGE: function () {
      return Fg;
    },
    W_MOD_IX: function () {
      return Z_;
    },
    W_MOD_JS: function () {
      return $_;
    },
  });
  var k_ = "|",
    Q_ = "data-wf-page",
    $_ = "w-mod-js",
    Z_ = "w-mod-ix",
    J_ = ".w-dyn-item",
    eg = "xValue",
    tg = "yValue",
    rg = "zValue",
    ng = "value",
    ig = "xUnit",
    og = "yUnit",
    ug = "zUnit",
    ag = "unit",
    sg = "transform",
    cg = "translateX",
    lg = "translateY",
    fg = "translateZ",
    dg = "translate3d",
    pg = "scaleX",
    Eg = "scaleY",
    _g = "scaleZ",
    gg = "scale3d",
    Ig = "rotateX",
    hg = "rotateY",
    Tg = "rotateZ",
    yg = "skew",
    Og = "skewX",
    vg = "skewY",
    Ag = "opacity",
    Sg = "filter",
    Cg = "font-variation-settings",
    Rg = "width",
    mg = "height",
    Ng = "backgroundColor",
    Pg = "background",
    bg = "borderColor",
    Lg = "color",
    Dg = "display",
    Mg = "flex",
    Fg = "willChange",
    qg = "AUTO",
    wg = ",",
    xg = ":",
    Gg = "|",
    Vg = "CHILDREN",
    Xg = "IMMEDIATE_CHILDREN",
    Ug = "SIBLINGS",
    Bg = "PARENT",
    Wg = "preserve-3d",
    Hg = "HTML_ELEMENT",
    jg = "PLAIN_OBJECT",
    Kg = "ABSTRACT_NODE",
    Yg = "RENDER_TRANSFORM",
    zg = "RENDER_GENERAL",
    kg = "RENDER_STYLE",
    Qg = "RENDER_PLUGIN";
});
var G = c((ue) => {
  "use strict";
  Object.defineProperty(ue, "__esModule", { value: !0 });
  function $g(e, t) {
    for (var r in t) Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
  }
  $g(ue, {
    ActionTypeConsts: function () {
      return Jg.ActionTypeConsts;
    },
    IX2EngineActionTypes: function () {
      return eI;
    },
    IX2EngineConstants: function () {
      return tI;
    },
    QuickEffectIds: function () {
      return Zg.QuickEffectIds;
    },
  });
  var Zg = at(ro(), ue),
    Jg = at(Nr(), ue);
  at(no(), ue);
  at(io(), ue);
  var eI = so(oo()),
    tI = so(uo());
  function at(e, t) {
    return (
      Object.keys(e).forEach(function (r) {
        r !== "default" &&
          !Object.prototype.hasOwnProperty.call(t, r) &&
          Object.defineProperty(t, r, {
            enumerable: !0,
            get: function () {
              return e[r];
            },
          });
      }),
      e
    );
  }
  function ao(e) {
    if (typeof WeakMap != "function") return null;
    var t = new WeakMap(),
      r = new WeakMap();
    return (ao = function (n) {
      return n ? r : t;
    })(e);
  }
  function so(e, t) {
    if (!t && e && e.__esModule) return e;
    if (e === null || (typeof e != "object" && typeof e != "function"))
      return { default: e };
    var r = ao(t);
    if (r && r.has(e)) return r.get(e);
    var n = { __proto__: null },
      i = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for (var o in e)
      if (o !== "default" && Object.prototype.hasOwnProperty.call(e, o)) {
        var u = i ? Object.getOwnPropertyDescriptor(e, o) : null;
        u && (u.get || u.set) ? Object.defineProperty(n, o, u) : (n[o] = e[o]);
      }
    return (n.default = e), r && r.set(e, n), n;
  }
});
var co = c((Mr) => {
  "use strict";
  Object.defineProperty(Mr, "__esModule", { value: !0 });
  Object.defineProperty(Mr, "ixData", {
    enumerable: !0,
    get: function () {
      return iI;
    },
  });
  var rI = G(),
    { IX2_RAW_DATA_IMPORTED: nI } = rI.IX2EngineActionTypes,
    iI = (e = Object.freeze({}), t) => {
      switch (t.type) {
        case nI:
          return t.payload.ixData || Object.freeze({});
        default:
          return e;
      }
    };
});
var he = c((D) => {
  "use strict";
  Object.defineProperty(D, "__esModule", { value: !0 });
  var oI =
    typeof Symbol == "function" && typeof Symbol.iterator == "symbol"
      ? function (e) {
          return typeof e;
        }
      : function (e) {
          return e &&
            typeof Symbol == "function" &&
            e.constructor === Symbol &&
            e !== Symbol.prototype
            ? "symbol"
            : typeof e;
        };
  D.clone = ct;
  D.addLast = po;
  D.addFirst = Eo;
  D.removeLast = _o;
  D.removeFirst = go;
  D.insert = Io;
  D.removeAt = ho;
  D.replaceAt = To;
  D.getIn = lt;
  D.set = ft;
  D.setIn = dt;
  D.update = Oo;
  D.updateIn = vo;
  D.merge = Ao;
  D.mergeDeep = So;
  D.mergeIn = Co;
  D.omit = Ro;
  D.addDefaults = mo;
  var lo = "INVALID_ARGS";
  function fo(e) {
    throw new Error(e);
  }
  function Fr(e) {
    var t = Object.keys(e);
    return Object.getOwnPropertySymbols
      ? t.concat(Object.getOwnPropertySymbols(e))
      : t;
  }
  var uI = {}.hasOwnProperty;
  function ct(e) {
    if (Array.isArray(e)) return e.slice();
    for (var t = Fr(e), r = {}, n = 0; n < t.length; n++) {
      var i = t[n];
      r[i] = e[i];
    }
    return r;
  }
  function V(e, t, r) {
    var n = r;
    n == null && fo(lo);
    for (
      var i = !1, o = arguments.length, u = Array(o > 3 ? o - 3 : 0), a = 3;
      a < o;
      a++
    )
      u[a - 3] = arguments[a];
    for (var s = 0; s < u.length; s++) {
      var l = u[s];
      if (l != null) {
        var d = Fr(l);
        if (d.length)
          for (var p = 0; p <= d.length; p++) {
            var f = d[p];
            if (!(e && n[f] !== void 0)) {
              var E = l[f];
              t && st(n[f]) && st(E) && (E = V(e, t, n[f], E)),
                !(E === void 0 || E === n[f]) &&
                  (i || ((i = !0), (n = ct(n))), (n[f] = E));
            }
          }
      }
    }
    return n;
  }
  function st(e) {
    var t = typeof e > "u" ? "undefined" : oI(e);
    return e != null && (t === "object" || t === "function");
  }
  function po(e, t) {
    return Array.isArray(t) ? e.concat(t) : e.concat([t]);
  }
  function Eo(e, t) {
    return Array.isArray(t) ? t.concat(e) : [t].concat(e);
  }
  function _o(e) {
    return e.length ? e.slice(0, e.length - 1) : e;
  }
  function go(e) {
    return e.length ? e.slice(1) : e;
  }
  function Io(e, t, r) {
    return e
      .slice(0, t)
      .concat(Array.isArray(r) ? r : [r])
      .concat(e.slice(t));
  }
  function ho(e, t) {
    return t >= e.length || t < 0 ? e : e.slice(0, t).concat(e.slice(t + 1));
  }
  function To(e, t, r) {
    if (e[t] === r) return e;
    for (var n = e.length, i = Array(n), o = 0; o < n; o++) i[o] = e[o];
    return (i[t] = r), i;
  }
  function lt(e, t) {
    if ((!Array.isArray(t) && fo(lo), e != null)) {
      for (var r = e, n = 0; n < t.length; n++) {
        var i = t[n];
        if (((r = r?.[i]), r === void 0)) return r;
      }
      return r;
    }
  }
  function ft(e, t, r) {
    var n = typeof t == "number" ? [] : {},
      i = e ?? n;
    if (i[t] === r) return i;
    var o = ct(i);
    return (o[t] = r), o;
  }
  function yo(e, t, r, n) {
    var i = void 0,
      o = t[n];
    if (n === t.length - 1) i = r;
    else {
      var u = st(e) && st(e[o]) ? e[o] : typeof t[n + 1] == "number" ? [] : {};
      i = yo(u, t, r, n + 1);
    }
    return ft(e, o, i);
  }
  function dt(e, t, r) {
    return t.length ? yo(e, t, r, 0) : r;
  }
  function Oo(e, t, r) {
    var n = e?.[t],
      i = r(n);
    return ft(e, t, i);
  }
  function vo(e, t, r) {
    var n = lt(e, t),
      i = r(n);
    return dt(e, t, i);
  }
  function Ao(e, t, r, n, i, o) {
    for (
      var u = arguments.length, a = Array(u > 6 ? u - 6 : 0), s = 6;
      s < u;
      s++
    )
      a[s - 6] = arguments[s];
    return a.length
      ? V.call.apply(V, [null, !1, !1, e, t, r, n, i, o].concat(a))
      : V(!1, !1, e, t, r, n, i, o);
  }
  function So(e, t, r, n, i, o) {
    for (
      var u = arguments.length, a = Array(u > 6 ? u - 6 : 0), s = 6;
      s < u;
      s++
    )
      a[s - 6] = arguments[s];
    return a.length
      ? V.call.apply(V, [null, !1, !0, e, t, r, n, i, o].concat(a))
      : V(!1, !0, e, t, r, n, i, o);
  }
  function Co(e, t, r, n, i, o, u) {
    var a = lt(e, t);
    a == null && (a = {});
    for (
      var s = void 0, l = arguments.length, d = Array(l > 7 ? l - 7 : 0), p = 7;
      p < l;
      p++
    )
      d[p - 7] = arguments[p];
    return (
      d.length
        ? (s = V.call.apply(V, [null, !1, !1, a, r, n, i, o, u].concat(d)))
        : (s = V(!1, !1, a, r, n, i, o, u)),
      dt(e, t, s)
    );
  }
  function Ro(e, t) {
    for (var r = Array.isArray(t) ? t : [t], n = !1, i = 0; i < r.length; i++)
      if (uI.call(e, r[i])) {
        n = !0;
        break;
      }
    if (!n) return e;
    for (var o = {}, u = Fr(e), a = 0; a < u.length; a++) {
      var s = u[a];
      r.indexOf(s) >= 0 || (o[s] = e[s]);
    }
    return o;
  }
  function mo(e, t, r, n, i, o) {
    for (
      var u = arguments.length, a = Array(u > 6 ? u - 6 : 0), s = 6;
      s < u;
      s++
    )
      a[s - 6] = arguments[s];
    return a.length
      ? V.call.apply(V, [null, !0, !1, e, t, r, n, i, o].concat(a))
      : V(!0, !1, e, t, r, n, i, o);
  }
  var aI = {
    clone: ct,
    addLast: po,
    addFirst: Eo,
    removeLast: _o,
    removeFirst: go,
    insert: Io,
    removeAt: ho,
    replaceAt: To,
    getIn: lt,
    set: ft,
    setIn: dt,
    update: Oo,
    updateIn: vo,
    merge: Ao,
    mergeDeep: So,
    mergeIn: Co,
    omit: Ro,
    addDefaults: mo,
  };
  D.default = aI;
});
var Po = c((qr) => {
  "use strict";
  Object.defineProperty(qr, "__esModule", { value: !0 });
  Object.defineProperty(qr, "ixRequest", {
    enumerable: !0,
    get: function () {
      return _I;
    },
  });
  var sI = G(),
    cI = he(),
    {
      IX2_PREVIEW_REQUESTED: lI,
      IX2_PLAYBACK_REQUESTED: fI,
      IX2_STOP_REQUESTED: dI,
      IX2_CLEAR_REQUESTED: pI,
    } = sI.IX2EngineActionTypes,
    EI = { preview: {}, playback: {}, stop: {}, clear: {} },
    No = Object.create(null, {
      [lI]: { value: "preview" },
      [fI]: { value: "playback" },
      [dI]: { value: "stop" },
      [pI]: { value: "clear" },
    }),
    _I = (e = EI, t) => {
      if (t.type in No) {
        let r = [No[t.type]];
        return (0, cI.setIn)(e, [r], { ...t.payload });
      }
      return e;
    };
});
var Lo = c((wr) => {
  "use strict";
  Object.defineProperty(wr, "__esModule", { value: !0 });
  Object.defineProperty(wr, "ixSession", {
    enumerable: !0,
    get: function () {
      return NI;
    },
  });
  var gI = G(),
    j = he(),
    {
      IX2_SESSION_INITIALIZED: II,
      IX2_SESSION_STARTED: hI,
      IX2_TEST_FRAME_RENDERED: TI,
      IX2_SESSION_STOPPED: yI,
      IX2_EVENT_LISTENER_ADDED: OI,
      IX2_EVENT_STATE_CHANGED: vI,
      IX2_ANIMATION_FRAME_CHANGED: AI,
      IX2_ACTION_LIST_PLAYBACK_CHANGED: SI,
      IX2_VIEWPORT_WIDTH_CHANGED: CI,
      IX2_MEDIA_QUERIES_DEFINED: RI,
    } = gI.IX2EngineActionTypes,
    bo = {
      active: !1,
      tick: 0,
      eventListeners: [],
      eventState: {},
      playbackState: {},
      viewportWidth: 0,
      mediaQueryKey: null,
      hasBoundaryNodes: !1,
      hasDefinedMediaQueries: !1,
      reducedMotion: !1,
    },
    mI = 20,
    NI = (e = bo, t) => {
      switch (t.type) {
        case II: {
          let { hasBoundaryNodes: r, reducedMotion: n } = t.payload;
          return (0, j.merge)(e, { hasBoundaryNodes: r, reducedMotion: n });
        }
        case hI:
          return (0, j.set)(e, "active", !0);
        case TI: {
          let {
            payload: { step: r = mI },
          } = t;
          return (0, j.set)(e, "tick", e.tick + r);
        }
        case yI:
          return bo;
        case AI: {
          let {
            payload: { now: r },
          } = t;
          return (0, j.set)(e, "tick", r);
        }
        case OI: {
          let r = (0, j.addLast)(e.eventListeners, t.payload);
          return (0, j.set)(e, "eventListeners", r);
        }
        case vI: {
          let { stateKey: r, newState: n } = t.payload;
          return (0, j.setIn)(e, ["eventState", r], n);
        }
        case SI: {
          let { actionListId: r, isPlaying: n } = t.payload;
          return (0, j.setIn)(e, ["playbackState", r], n);
        }
        case CI: {
          let { width: r, mediaQueries: n } = t.payload,
            i = n.length,
            o = null;
          for (let u = 0; u < i; u++) {
            let { key: a, min: s, max: l } = n[u];
            if (r >= s && r <= l) {
              o = a;
              break;
            }
          }
          return (0, j.merge)(e, { viewportWidth: r, mediaQueryKey: o });
        }
        case RI:
          return (0, j.set)(e, "hasDefinedMediaQueries", !0);
        default:
          return e;
      }
    };
});
var Mo = c((Dq, Do) => {
  function PI() {
    (this.__data__ = []), (this.size = 0);
  }
  Do.exports = PI;
});
var pt = c((Mq, Fo) => {
  function bI(e, t) {
    return e === t || (e !== e && t !== t);
  }
  Fo.exports = bI;
});
var Ve = c((Fq, qo) => {
  var LI = pt();
  function DI(e, t) {
    for (var r = e.length; r--; ) if (LI(e[r][0], t)) return r;
    return -1;
  }
  qo.exports = DI;
});
var xo = c((qq, wo) => {
  var MI = Ve(),
    FI = Array.prototype,
    qI = FI.splice;
  function wI(e) {
    var t = this.__data__,
      r = MI(t, e);
    if (r < 0) return !1;
    var n = t.length - 1;
    return r == n ? t.pop() : qI.call(t, r, 1), --this.size, !0;
  }
  wo.exports = wI;
});
var Vo = c((wq, Go) => {
  var xI = Ve();
  function GI(e) {
    var t = this.__data__,
      r = xI(t, e);
    return r < 0 ? void 0 : t[r][1];
  }
  Go.exports = GI;
});
var Uo = c((xq, Xo) => {
  var VI = Ve();
  function XI(e) {
    return VI(this.__data__, e) > -1;
  }
  Xo.exports = XI;
});
var Wo = c((Gq, Bo) => {
  var UI = Ve();
  function BI(e, t) {
    var r = this.__data__,
      n = UI(r, e);
    return n < 0 ? (++this.size, r.push([e, t])) : (r[n][1] = t), this;
  }
  Bo.exports = BI;
});
var Xe = c((Vq, Ho) => {
  var WI = Mo(),
    HI = xo(),
    jI = Vo(),
    KI = Uo(),
    YI = Wo();
  function Te(e) {
    var t = -1,
      r = e == null ? 0 : e.length;
    for (this.clear(); ++t < r; ) {
      var n = e[t];
      this.set(n[0], n[1]);
    }
  }
  Te.prototype.clear = WI;
  Te.prototype.delete = HI;
  Te.prototype.get = jI;
  Te.prototype.has = KI;
  Te.prototype.set = YI;
  Ho.exports = Te;
});
var Ko = c((Xq, jo) => {
  var zI = Xe();
  function kI() {
    (this.__data__ = new zI()), (this.size = 0);
  }
  jo.exports = kI;
});
var zo = c((Uq, Yo) => {
  function QI(e) {
    var t = this.__data__,
      r = t.delete(e);
    return (this.size = t.size), r;
  }
  Yo.exports = QI;
});
var Qo = c((Bq, ko) => {
  function $I(e) {
    return this.__data__.get(e);
  }
  ko.exports = $I;
});
var Zo = c((Wq, $o) => {
  function ZI(e) {
    return this.__data__.has(e);
  }
  $o.exports = ZI;
});
var K = c((Hq, Jo) => {
  function JI(e) {
    var t = typeof e;
    return e != null && (t == "object" || t == "function");
  }
  Jo.exports = JI;
});
var xr = c((jq, eu) => {
  var eh = ee(),
    th = K(),
    rh = "[object AsyncFunction]",
    nh = "[object Function]",
    ih = "[object GeneratorFunction]",
    oh = "[object Proxy]";
  function uh(e) {
    if (!th(e)) return !1;
    var t = eh(e);
    return t == nh || t == ih || t == rh || t == oh;
  }
  eu.exports = uh;
});
var ru = c((Kq, tu) => {
  var ah = W(),
    sh = ah["__core-js_shared__"];
  tu.exports = sh;
});
var ou = c((Yq, iu) => {
  var Gr = ru(),
    nu = (function () {
      var e = /[^.]+$/.exec((Gr && Gr.keys && Gr.keys.IE_PROTO) || "");
      return e ? "Symbol(src)_1." + e : "";
    })();
  function ch(e) {
    return !!nu && nu in e;
  }
  iu.exports = ch;
});
var Vr = c((zq, uu) => {
  var lh = Function.prototype,
    fh = lh.toString;
  function dh(e) {
    if (e != null) {
      try {
        return fh.call(e);
      } catch {}
      try {
        return e + "";
      } catch {}
    }
    return "";
  }
  uu.exports = dh;
});
var su = c((kq, au) => {
  var ph = xr(),
    Eh = ou(),
    _h = K(),
    gh = Vr(),
    Ih = /[\\^$.*+?()[\]{}|]/g,
    hh = /^\[object .+?Constructor\]$/,
    Th = Function.prototype,
    yh = Object.prototype,
    Oh = Th.toString,
    vh = yh.hasOwnProperty,
    Ah = RegExp(
      "^" +
        Oh.call(vh)
          .replace(Ih, "\\$&")
          .replace(
            /hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,
            "$1.*?"
          ) +
        "$"
    );
  function Sh(e) {
    if (!_h(e) || Eh(e)) return !1;
    var t = ph(e) ? Ah : hh;
    return t.test(gh(e));
  }
  au.exports = Sh;
});
var lu = c((Qq, cu) => {
  function Ch(e, t) {
    return e?.[t];
  }
  cu.exports = Ch;
});
var te = c(($q, fu) => {
  var Rh = su(),
    mh = lu();
  function Nh(e, t) {
    var r = mh(e, t);
    return Rh(r) ? r : void 0;
  }
  fu.exports = Nh;
});
var Et = c((Zq, du) => {
  var Ph = te(),
    bh = W(),
    Lh = Ph(bh, "Map");
  du.exports = Lh;
});
var Ue = c((Jq, pu) => {
  var Dh = te(),
    Mh = Dh(Object, "create");
  pu.exports = Mh;
});
var gu = c((ew, _u) => {
  var Eu = Ue();
  function Fh() {
    (this.__data__ = Eu ? Eu(null) : {}), (this.size = 0);
  }
  _u.exports = Fh;
});
var hu = c((tw, Iu) => {
  function qh(e) {
    var t = this.has(e) && delete this.__data__[e];
    return (this.size -= t ? 1 : 0), t;
  }
  Iu.exports = qh;
});
var yu = c((rw, Tu) => {
  var wh = Ue(),
    xh = "__lodash_hash_undefined__",
    Gh = Object.prototype,
    Vh = Gh.hasOwnProperty;
  function Xh(e) {
    var t = this.__data__;
    if (wh) {
      var r = t[e];
      return r === xh ? void 0 : r;
    }
    return Vh.call(t, e) ? t[e] : void 0;
  }
  Tu.exports = Xh;
});
var vu = c((nw, Ou) => {
  var Uh = Ue(),
    Bh = Object.prototype,
    Wh = Bh.hasOwnProperty;
  function Hh(e) {
    var t = this.__data__;
    return Uh ? t[e] !== void 0 : Wh.call(t, e);
  }
  Ou.exports = Hh;
});
var Su = c((iw, Au) => {
  var jh = Ue(),
    Kh = "__lodash_hash_undefined__";
  function Yh(e, t) {
    var r = this.__data__;
    return (
      (this.size += this.has(e) ? 0 : 1),
      (r[e] = jh && t === void 0 ? Kh : t),
      this
    );
  }
  Au.exports = Yh;
});
var Ru = c((ow, Cu) => {
  var zh = gu(),
    kh = hu(),
    Qh = yu(),
    $h = vu(),
    Zh = Su();
  function ye(e) {
    var t = -1,
      r = e == null ? 0 : e.length;
    for (this.clear(); ++t < r; ) {
      var n = e[t];
      this.set(n[0], n[1]);
    }
  }
  ye.prototype.clear = zh;
  ye.prototype.delete = kh;
  ye.prototype.get = Qh;
  ye.prototype.has = $h;
  ye.prototype.set = Zh;
  Cu.exports = ye;
});
var Pu = c((uw, Nu) => {
  var mu = Ru(),
    Jh = Xe(),
    eT = Et();
  function tT() {
    (this.size = 0),
      (this.__data__ = {
        hash: new mu(),
        map: new (eT || Jh)(),
        string: new mu(),
      });
  }
  Nu.exports = tT;
});
var Lu = c((aw, bu) => {
  function rT(e) {
    var t = typeof e;
    return t == "string" || t == "number" || t == "symbol" || t == "boolean"
      ? e !== "__proto__"
      : e === null;
  }
  bu.exports = rT;
});
var Be = c((sw, Du) => {
  var nT = Lu();
  function iT(e, t) {
    var r = e.__data__;
    return nT(t) ? r[typeof t == "string" ? "string" : "hash"] : r.map;
  }
  Du.exports = iT;
});
var Fu = c((cw, Mu) => {
  var oT = Be();
  function uT(e) {
    var t = oT(this, e).delete(e);
    return (this.size -= t ? 1 : 0), t;
  }
  Mu.exports = uT;
});
var wu = c((lw, qu) => {
  var aT = Be();
  function sT(e) {
    return aT(this, e).get(e);
  }
  qu.exports = sT;
});
var Gu = c((fw, xu) => {
  var cT = Be();
  function lT(e) {
    return cT(this, e).has(e);
  }
  xu.exports = lT;
});
var Xu = c((dw, Vu) => {
  var fT = Be();
  function dT(e, t) {
    var r = fT(this, e),
      n = r.size;
    return r.set(e, t), (this.size += r.size == n ? 0 : 1), this;
  }
  Vu.exports = dT;
});
var _t = c((pw, Uu) => {
  var pT = Pu(),
    ET = Fu(),
    _T = wu(),
    gT = Gu(),
    IT = Xu();
  function Oe(e) {
    var t = -1,
      r = e == null ? 0 : e.length;
    for (this.clear(); ++t < r; ) {
      var n = e[t];
      this.set(n[0], n[1]);
    }
  }
  Oe.prototype.clear = pT;
  Oe.prototype.delete = ET;
  Oe.prototype.get = _T;
  Oe.prototype.has = gT;
  Oe.prototype.set = IT;
  Uu.exports = Oe;
});
var Wu = c((Ew, Bu) => {
  var hT = Xe(),
    TT = Et(),
    yT = _t(),
    OT = 200;
  function vT(e, t) {
    var r = this.__data__;
    if (r instanceof hT) {
      var n = r.__data__;
      if (!TT || n.length < OT - 1)
        return n.push([e, t]), (this.size = ++r.size), this;
      r = this.__data__ = new yT(n);
    }
    return r.set(e, t), (this.size = r.size), this;
  }
  Bu.exports = vT;
});
var Xr = c((_w, Hu) => {
  var AT = Xe(),
    ST = Ko(),
    CT = zo(),
    RT = Qo(),
    mT = Zo(),
    NT = Wu();
  function ve(e) {
    var t = (this.__data__ = new AT(e));
    this.size = t.size;
  }
  ve.prototype.clear = ST;
  ve.prototype.delete = CT;
  ve.prototype.get = RT;
  ve.prototype.has = mT;
  ve.prototype.set = NT;
  Hu.exports = ve;
});
var Ku = c((gw, ju) => {
  var PT = "__lodash_hash_undefined__";
  function bT(e) {
    return this.__data__.set(e, PT), this;
  }
  ju.exports = bT;
});
var zu = c((Iw, Yu) => {
  function LT(e) {
    return this.__data__.has(e);
  }
  Yu.exports = LT;
});
var Qu = c((hw, ku) => {
  var DT = _t(),
    MT = Ku(),
    FT = zu();
  function gt(e) {
    var t = -1,
      r = e == null ? 0 : e.length;
    for (this.__data__ = new DT(); ++t < r; ) this.add(e[t]);
  }
  gt.prototype.add = gt.prototype.push = MT;
  gt.prototype.has = FT;
  ku.exports = gt;
});
var Zu = c((Tw, $u) => {
  function qT(e, t) {
    for (var r = -1, n = e == null ? 0 : e.length; ++r < n; )
      if (t(e[r], r, e)) return !0;
    return !1;
  }
  $u.exports = qT;
});
var ea = c((yw, Ju) => {
  function wT(e, t) {
    return e.has(t);
  }
  Ju.exports = wT;
});
var Ur = c((Ow, ta) => {
  var xT = Qu(),
    GT = Zu(),
    VT = ea(),
    XT = 1,
    UT = 2;
  function BT(e, t, r, n, i, o) {
    var u = r & XT,
      a = e.length,
      s = t.length;
    if (a != s && !(u && s > a)) return !1;
    var l = o.get(e),
      d = o.get(t);
    if (l && d) return l == t && d == e;
    var p = -1,
      f = !0,
      E = r & UT ? new xT() : void 0;
    for (o.set(e, t), o.set(t, e); ++p < a; ) {
      var g = e[p],
        _ = t[p];
      if (n) var h = u ? n(_, g, p, t, e, o) : n(g, _, p, e, t, o);
      if (h !== void 0) {
        if (h) continue;
        f = !1;
        break;
      }
      if (E) {
        if (
          !GT(t, function (I, y) {
            if (!VT(E, y) && (g === I || i(g, I, r, n, o))) return E.push(y);
          })
        ) {
          f = !1;
          break;
        }
      } else if (!(g === _ || i(g, _, r, n, o))) {
        f = !1;
        break;
      }
    }
    return o.delete(e), o.delete(t), f;
  }
  ta.exports = BT;
});
var na = c((vw, ra) => {
  var WT = W(),
    HT = WT.Uint8Array;
  ra.exports = HT;
});
var oa = c((Aw, ia) => {
  function jT(e) {
    var t = -1,
      r = Array(e.size);
    return (
      e.forEach(function (n, i) {
        r[++t] = [i, n];
      }),
      r
    );
  }
  ia.exports = jT;
});
var aa = c((Sw, ua) => {
  function KT(e) {
    var t = -1,
      r = Array(e.size);
    return (
      e.forEach(function (n) {
        r[++t] = n;
      }),
      r
    );
  }
  ua.exports = KT;
});
var da = c((Cw, fa) => {
  var sa = _e(),
    ca = na(),
    YT = pt(),
    zT = Ur(),
    kT = oa(),
    QT = aa(),
    $T = 1,
    ZT = 2,
    JT = "[object Boolean]",
    ey = "[object Date]",
    ty = "[object Error]",
    ry = "[object Map]",
    ny = "[object Number]",
    iy = "[object RegExp]",
    oy = "[object Set]",
    uy = "[object String]",
    ay = "[object Symbol]",
    sy = "[object ArrayBuffer]",
    cy = "[object DataView]",
    la = sa ? sa.prototype : void 0,
    Br = la ? la.valueOf : void 0;
  function ly(e, t, r, n, i, o, u) {
    switch (r) {
      case cy:
        if (e.byteLength != t.byteLength || e.byteOffset != t.byteOffset)
          return !1;
        (e = e.buffer), (t = t.buffer);
      case sy:
        return !(e.byteLength != t.byteLength || !o(new ca(e), new ca(t)));
      case JT:
      case ey:
      case ny:
        return YT(+e, +t);
      case ty:
        return e.name == t.name && e.message == t.message;
      case iy:
      case uy:
        return e == t + "";
      case ry:
        var a = kT;
      case oy:
        var s = n & $T;
        if ((a || (a = QT), e.size != t.size && !s)) return !1;
        var l = u.get(e);
        if (l) return l == t;
        (n |= ZT), u.set(e, t);
        var d = zT(a(e), a(t), n, i, o, u);
        return u.delete(e), d;
      case ay:
        if (Br) return Br.call(e) == Br.call(t);
    }
    return !1;
  }
  fa.exports = ly;
});
var It = c((Rw, pa) => {
  function fy(e, t) {
    for (var r = -1, n = t.length, i = e.length; ++r < n; ) e[i + r] = t[r];
    return e;
  }
  pa.exports = fy;
});
var w = c((mw, Ea) => {
  var dy = Array.isArray;
  Ea.exports = dy;
});
var Wr = c((Nw, _a) => {
  var py = It(),
    Ey = w();
  function _y(e, t, r) {
    var n = t(e);
    return Ey(e) ? n : py(n, r(e));
  }
  _a.exports = _y;
});
var Ia = c((Pw, ga) => {
  function gy(e, t) {
    for (var r = -1, n = e == null ? 0 : e.length, i = 0, o = []; ++r < n; ) {
      var u = e[r];
      t(u, r, e) && (o[i++] = u);
    }
    return o;
  }
  ga.exports = gy;
});
var Hr = c((bw, ha) => {
  function Iy() {
    return [];
  }
  ha.exports = Iy;
});
var jr = c((Lw, ya) => {
  var hy = Ia(),
    Ty = Hr(),
    yy = Object.prototype,
    Oy = yy.propertyIsEnumerable,
    Ta = Object.getOwnPropertySymbols,
    vy = Ta
      ? function (e) {
          return e == null
            ? []
            : ((e = Object(e)),
              hy(Ta(e), function (t) {
                return Oy.call(e, t);
              }));
        }
      : Ty;
  ya.exports = vy;
});
var va = c((Dw, Oa) => {
  function Ay(e, t) {
    for (var r = -1, n = Array(e); ++r < e; ) n[r] = t(r);
    return n;
  }
  Oa.exports = Ay;
});
var Sa = c((Mw, Aa) => {
  var Sy = ee(),
    Cy = $(),
    Ry = "[object Arguments]";
  function my(e) {
    return Cy(e) && Sy(e) == Ry;
  }
  Aa.exports = my;
});
var We = c((Fw, ma) => {
  var Ca = Sa(),
    Ny = $(),
    Ra = Object.prototype,
    Py = Ra.hasOwnProperty,
    by = Ra.propertyIsEnumerable,
    Ly = Ca(
      (function () {
        return arguments;
      })()
    )
      ? Ca
      : function (e) {
          return Ny(e) && Py.call(e, "callee") && !by.call(e, "callee");
        };
  ma.exports = Ly;
});
var Pa = c((qw, Na) => {
  function Dy() {
    return !1;
  }
  Na.exports = Dy;
});
var ht = c((He, Ae) => {
  var My = W(),
    Fy = Pa(),
    Da = typeof He == "object" && He && !He.nodeType && He,
    ba = Da && typeof Ae == "object" && Ae && !Ae.nodeType && Ae,
    qy = ba && ba.exports === Da,
    La = qy ? My.Buffer : void 0,
    wy = La ? La.isBuffer : void 0,
    xy = wy || Fy;
  Ae.exports = xy;
});
var Tt = c((ww, Ma) => {
  var Gy = 9007199254740991,
    Vy = /^(?:0|[1-9]\d*)$/;
  function Xy(e, t) {
    var r = typeof e;
    return (
      (t = t ?? Gy),
      !!t &&
        (r == "number" || (r != "symbol" && Vy.test(e))) &&
        e > -1 &&
        e % 1 == 0 &&
        e < t
    );
  }
  Ma.exports = Xy;
});
var yt = c((xw, Fa) => {
  var Uy = 9007199254740991;
  function By(e) {
    return typeof e == "number" && e > -1 && e % 1 == 0 && e <= Uy;
  }
  Fa.exports = By;
});
var wa = c((Gw, qa) => {
  var Wy = ee(),
    Hy = yt(),
    jy = $(),
    Ky = "[object Arguments]",
    Yy = "[object Array]",
    zy = "[object Boolean]",
    ky = "[object Date]",
    Qy = "[object Error]",
    $y = "[object Function]",
    Zy = "[object Map]",
    Jy = "[object Number]",
    eO = "[object Object]",
    tO = "[object RegExp]",
    rO = "[object Set]",
    nO = "[object String]",
    iO = "[object WeakMap]",
    oO = "[object ArrayBuffer]",
    uO = "[object DataView]",
    aO = "[object Float32Array]",
    sO = "[object Float64Array]",
    cO = "[object Int8Array]",
    lO = "[object Int16Array]",
    fO = "[object Int32Array]",
    dO = "[object Uint8Array]",
    pO = "[object Uint8ClampedArray]",
    EO = "[object Uint16Array]",
    _O = "[object Uint32Array]",
    L = {};
  L[aO] = L[sO] = L[cO] = L[lO] = L[fO] = L[dO] = L[pO] = L[EO] = L[_O] = !0;
  L[Ky] =
    L[Yy] =
    L[oO] =
    L[zy] =
    L[uO] =
    L[ky] =
    L[Qy] =
    L[$y] =
    L[Zy] =
    L[Jy] =
    L[eO] =
    L[tO] =
    L[rO] =
    L[nO] =
    L[iO] =
      !1;
  function gO(e) {
    return jy(e) && Hy(e.length) && !!L[Wy(e)];
  }
  qa.exports = gO;
});
var Ga = c((Vw, xa) => {
  function IO(e) {
    return function (t) {
      return e(t);
    };
  }
  xa.exports = IO;
});
var Xa = c((je, Se) => {
  var hO = lr(),
    Va = typeof je == "object" && je && !je.nodeType && je,
    Ke = Va && typeof Se == "object" && Se && !Se.nodeType && Se,
    TO = Ke && Ke.exports === Va,
    Kr = TO && hO.process,
    yO = (function () {
      try {
        var e = Ke && Ke.require && Ke.require("util").types;
        return e || (Kr && Kr.binding && Kr.binding("util"));
      } catch {}
    })();
  Se.exports = yO;
});
var Ot = c((Xw, Wa) => {
  var OO = wa(),
    vO = Ga(),
    Ua = Xa(),
    Ba = Ua && Ua.isTypedArray,
    AO = Ba ? vO(Ba) : OO;
  Wa.exports = AO;
});
var Yr = c((Uw, Ha) => {
  var SO = va(),
    CO = We(),
    RO = w(),
    mO = ht(),
    NO = Tt(),
    PO = Ot(),
    bO = Object.prototype,
    LO = bO.hasOwnProperty;
  function DO(e, t) {
    var r = RO(e),
      n = !r && CO(e),
      i = !r && !n && mO(e),
      o = !r && !n && !i && PO(e),
      u = r || n || i || o,
      a = u ? SO(e.length, String) : [],
      s = a.length;
    for (var l in e)
      (t || LO.call(e, l)) &&
        !(
          u &&
          (l == "length" ||
            (i && (l == "offset" || l == "parent")) ||
            (o && (l == "buffer" || l == "byteLength" || l == "byteOffset")) ||
            NO(l, s))
        ) &&
        a.push(l);
    return a;
  }
  Ha.exports = DO;
});
var vt = c((Bw, ja) => {
  var MO = Object.prototype;
  function FO(e) {
    var t = e && e.constructor,
      r = (typeof t == "function" && t.prototype) || MO;
    return e === r;
  }
  ja.exports = FO;
});
var Ya = c((Ww, Ka) => {
  var qO = fr(),
    wO = qO(Object.keys, Object);
  Ka.exports = wO;
});
var At = c((Hw, za) => {
  var xO = vt(),
    GO = Ya(),
    VO = Object.prototype,
    XO = VO.hasOwnProperty;
  function UO(e) {
    if (!xO(e)) return GO(e);
    var t = [];
    for (var r in Object(e)) XO.call(e, r) && r != "constructor" && t.push(r);
    return t;
  }
  za.exports = UO;
});
var ae = c((jw, ka) => {
  var BO = xr(),
    WO = yt();
  function HO(e) {
    return e != null && WO(e.length) && !BO(e);
  }
  ka.exports = HO;
});
var Ye = c((Kw, Qa) => {
  var jO = Yr(),
    KO = At(),
    YO = ae();
  function zO(e) {
    return YO(e) ? jO(e) : KO(e);
  }
  Qa.exports = zO;
});
var Za = c((Yw, $a) => {
  var kO = Wr(),
    QO = jr(),
    $O = Ye();
  function ZO(e) {
    return kO(e, $O, QO);
  }
  $a.exports = ZO;
});
var ts = c((zw, es) => {
  var Ja = Za(),
    JO = 1,
    ev = Object.prototype,
    tv = ev.hasOwnProperty;
  function rv(e, t, r, n, i, o) {
    var u = r & JO,
      a = Ja(e),
      s = a.length,
      l = Ja(t),
      d = l.length;
    if (s != d && !u) return !1;
    for (var p = s; p--; ) {
      var f = a[p];
      if (!(u ? f in t : tv.call(t, f))) return !1;
    }
    var E = o.get(e),
      g = o.get(t);
    if (E && g) return E == t && g == e;
    var _ = !0;
    o.set(e, t), o.set(t, e);
    for (var h = u; ++p < s; ) {
      f = a[p];
      var I = e[f],
        y = t[f];
      if (n) var A = u ? n(y, I, f, t, e, o) : n(I, y, f, e, t, o);
      if (!(A === void 0 ? I === y || i(I, y, r, n, o) : A)) {
        _ = !1;
        break;
      }
      h || (h = f == "constructor");
    }
    if (_ && !h) {
      var O = e.constructor,
        C = t.constructor;
      O != C &&
        "constructor" in e &&
        "constructor" in t &&
        !(
          typeof O == "function" &&
          O instanceof O &&
          typeof C == "function" &&
          C instanceof C
        ) &&
        (_ = !1);
    }
    return o.delete(e), o.delete(t), _;
  }
  es.exports = rv;
});
var ns = c((kw, rs) => {
  var nv = te(),
    iv = W(),
    ov = nv(iv, "DataView");
  rs.exports = ov;
});
var os = c((Qw, is) => {
  var uv = te(),
    av = W(),
    sv = uv(av, "Promise");
  is.exports = sv;
});
var as = c(($w, us) => {
  var cv = te(),
    lv = W(),
    fv = cv(lv, "Set");
  us.exports = fv;
});
var zr = c((Zw, ss) => {
  var dv = te(),
    pv = W(),
    Ev = dv(pv, "WeakMap");
  ss.exports = Ev;
});
var St = c((Jw, _s) => {
  var kr = ns(),
    Qr = Et(),
    $r = os(),
    Zr = as(),
    Jr = zr(),
    Es = ee(),
    Ce = Vr(),
    cs = "[object Map]",
    _v = "[object Object]",
    ls = "[object Promise]",
    fs = "[object Set]",
    ds = "[object WeakMap]",
    ps = "[object DataView]",
    gv = Ce(kr),
    Iv = Ce(Qr),
    hv = Ce($r),
    Tv = Ce(Zr),
    yv = Ce(Jr),
    se = Es;
  ((kr && se(new kr(new ArrayBuffer(1))) != ps) ||
    (Qr && se(new Qr()) != cs) ||
    ($r && se($r.resolve()) != ls) ||
    (Zr && se(new Zr()) != fs) ||
    (Jr && se(new Jr()) != ds)) &&
    (se = function (e) {
      var t = Es(e),
        r = t == _v ? e.constructor : void 0,
        n = r ? Ce(r) : "";
      if (n)
        switch (n) {
          case gv:
            return ps;
          case Iv:
            return cs;
          case hv:
            return ls;
          case Tv:
            return fs;
          case yv:
            return ds;
        }
      return t;
    });
  _s.exports = se;
});
var As = c((ex, vs) => {
  var en = Xr(),
    Ov = Ur(),
    vv = da(),
    Av = ts(),
    gs = St(),
    Is = w(),
    hs = ht(),
    Sv = Ot(),
    Cv = 1,
    Ts = "[object Arguments]",
    ys = "[object Array]",
    Ct = "[object Object]",
    Rv = Object.prototype,
    Os = Rv.hasOwnProperty;
  function mv(e, t, r, n, i, o) {
    var u = Is(e),
      a = Is(t),
      s = u ? ys : gs(e),
      l = a ? ys : gs(t);
    (s = s == Ts ? Ct : s), (l = l == Ts ? Ct : l);
    var d = s == Ct,
      p = l == Ct,
      f = s == l;
    if (f && hs(e)) {
      if (!hs(t)) return !1;
      (u = !0), (d = !1);
    }
    if (f && !d)
      return (
        o || (o = new en()),
        u || Sv(e) ? Ov(e, t, r, n, i, o) : vv(e, t, s, r, n, i, o)
      );
    if (!(r & Cv)) {
      var E = d && Os.call(e, "__wrapped__"),
        g = p && Os.call(t, "__wrapped__");
      if (E || g) {
        var _ = E ? e.value() : e,
          h = g ? t.value() : t;
        return o || (o = new en()), i(_, h, r, n, o);
      }
    }
    return f ? (o || (o = new en()), Av(e, t, r, n, i, o)) : !1;
  }
  vs.exports = mv;
});
var tn = c((tx, Rs) => {
  var Nv = As(),
    Ss = $();
  function Cs(e, t, r, n, i) {
    return e === t
      ? !0
      : e == null || t == null || (!Ss(e) && !Ss(t))
      ? e !== e && t !== t
      : Nv(e, t, r, n, Cs, i);
  }
  Rs.exports = Cs;
});
var Ns = c((rx, ms) => {
  var Pv = Xr(),
    bv = tn(),
    Lv = 1,
    Dv = 2;
  function Mv(e, t, r, n) {
    var i = r.length,
      o = i,
      u = !n;
    if (e == null) return !o;
    for (e = Object(e); i--; ) {
      var a = r[i];
      if (u && a[2] ? a[1] !== e[a[0]] : !(a[0] in e)) return !1;
    }
    for (; ++i < o; ) {
      a = r[i];
      var s = a[0],
        l = e[s],
        d = a[1];
      if (u && a[2]) {
        if (l === void 0 && !(s in e)) return !1;
      } else {
        var p = new Pv();
        if (n) var f = n(l, d, s, e, t, p);
        if (!(f === void 0 ? bv(d, l, Lv | Dv, n, p) : f)) return !1;
      }
    }
    return !0;
  }
  ms.exports = Mv;
});
var rn = c((nx, Ps) => {
  var Fv = K();
  function qv(e) {
    return e === e && !Fv(e);
  }
  Ps.exports = qv;
});
var Ls = c((ix, bs) => {
  var wv = rn(),
    xv = Ye();
  function Gv(e) {
    for (var t = xv(e), r = t.length; r--; ) {
      var n = t[r],
        i = e[n];
      t[r] = [n, i, wv(i)];
    }
    return t;
  }
  bs.exports = Gv;
});
var nn = c((ox, Ds) => {
  function Vv(e, t) {
    return function (r) {
      return r == null ? !1 : r[e] === t && (t !== void 0 || e in Object(r));
    };
  }
  Ds.exports = Vv;
});
var Fs = c((ux, Ms) => {
  var Xv = Ns(),
    Uv = Ls(),
    Bv = nn();
  function Wv(e) {
    var t = Uv(e);
    return t.length == 1 && t[0][2]
      ? Bv(t[0][0], t[0][1])
      : function (r) {
          return r === e || Xv(r, e, t);
        };
  }
  Ms.exports = Wv;
});
var ze = c((ax, qs) => {
  var Hv = ee(),
    jv = $(),
    Kv = "[object Symbol]";
  function Yv(e) {
    return typeof e == "symbol" || (jv(e) && Hv(e) == Kv);
  }
  qs.exports = Yv;
});
var Rt = c((sx, ws) => {
  var zv = w(),
    kv = ze(),
    Qv = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
    $v = /^\w*$/;
  function Zv(e, t) {
    if (zv(e)) return !1;
    var r = typeof e;
    return r == "number" ||
      r == "symbol" ||
      r == "boolean" ||
      e == null ||
      kv(e)
      ? !0
      : $v.test(e) || !Qv.test(e) || (t != null && e in Object(t));
  }
  ws.exports = Zv;
});
var Vs = c((cx, Gs) => {
  var xs = _t(),
    Jv = "Expected a function";
  function on(e, t) {
    if (typeof e != "function" || (t != null && typeof t != "function"))
      throw new TypeError(Jv);
    var r = function () {
      var n = arguments,
        i = t ? t.apply(this, n) : n[0],
        o = r.cache;
      if (o.has(i)) return o.get(i);
      var u = e.apply(this, n);
      return (r.cache = o.set(i, u) || o), u;
    };
    return (r.cache = new (on.Cache || xs)()), r;
  }
  on.Cache = xs;
  Gs.exports = on;
});
var Us = c((lx, Xs) => {
  var eA = Vs(),
    tA = 500;
  function rA(e) {
    var t = eA(e, function (n) {
        return r.size === tA && r.clear(), n;
      }),
      r = t.cache;
    return t;
  }
  Xs.exports = rA;
});
var Ws = c((fx, Bs) => {
  var nA = Us(),
    iA =
      /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g,
    oA = /\\(\\)?/g,
    uA = nA(function (e) {
      var t = [];
      return (
        e.charCodeAt(0) === 46 && t.push(""),
        e.replace(iA, function (r, n, i, o) {
          t.push(i ? o.replace(oA, "$1") : n || r);
        }),
        t
      );
    });
  Bs.exports = uA;
});
var un = c((dx, Hs) => {
  function aA(e, t) {
    for (var r = -1, n = e == null ? 0 : e.length, i = Array(n); ++r < n; )
      i[r] = t(e[r], r, e);
    return i;
  }
  Hs.exports = aA;
});
var Qs = c((px, ks) => {
  var js = _e(),
    sA = un(),
    cA = w(),
    lA = ze(),
    fA = 1 / 0,
    Ks = js ? js.prototype : void 0,
    Ys = Ks ? Ks.toString : void 0;
  function zs(e) {
    if (typeof e == "string") return e;
    if (cA(e)) return sA(e, zs) + "";
    if (lA(e)) return Ys ? Ys.call(e) : "";
    var t = e + "";
    return t == "0" && 1 / e == -fA ? "-0" : t;
  }
  ks.exports = zs;
});
var Zs = c((Ex, $s) => {
  var dA = Qs();
  function pA(e) {
    return e == null ? "" : dA(e);
  }
  $s.exports = pA;
});
var ke = c((_x, Js) => {
  var EA = w(),
    _A = Rt(),
    gA = Ws(),
    IA = Zs();
  function hA(e, t) {
    return EA(e) ? e : _A(e, t) ? [e] : gA(IA(e));
  }
  Js.exports = hA;
});
var Re = c((gx, ec) => {
  var TA = ze(),
    yA = 1 / 0;
  function OA(e) {
    if (typeof e == "string" || TA(e)) return e;
    var t = e + "";
    return t == "0" && 1 / e == -yA ? "-0" : t;
  }
  ec.exports = OA;
});
var mt = c((Ix, tc) => {
  var vA = ke(),
    AA = Re();
  function SA(e, t) {
    t = vA(t, e);
    for (var r = 0, n = t.length; e != null && r < n; ) e = e[AA(t[r++])];
    return r && r == n ? e : void 0;
  }
  tc.exports = SA;
});
var Nt = c((hx, rc) => {
  var CA = mt();
  function RA(e, t, r) {
    var n = e == null ? void 0 : CA(e, t);
    return n === void 0 ? r : n;
  }
  rc.exports = RA;
});
var ic = c((Tx, nc) => {
  function mA(e, t) {
    return e != null && t in Object(e);
  }
  nc.exports = mA;
});
var uc = c((yx, oc) => {
  var NA = ke(),
    PA = We(),
    bA = w(),
    LA = Tt(),
    DA = yt(),
    MA = Re();
  function FA(e, t, r) {
    t = NA(t, e);
    for (var n = -1, i = t.length, o = !1; ++n < i; ) {
      var u = MA(t[n]);
      if (!(o = e != null && r(e, u))) break;
      e = e[u];
    }
    return o || ++n != i
      ? o
      : ((i = e == null ? 0 : e.length),
        !!i && DA(i) && LA(u, i) && (bA(e) || PA(e)));
  }
  oc.exports = FA;
});
var sc = c((Ox, ac) => {
  var qA = ic(),
    wA = uc();
  function xA(e, t) {
    return e != null && wA(e, t, qA);
  }
  ac.exports = xA;
});
var lc = c((vx, cc) => {
  var GA = tn(),
    VA = Nt(),
    XA = sc(),
    UA = Rt(),
    BA = rn(),
    WA = nn(),
    HA = Re(),
    jA = 1,
    KA = 2;
  function YA(e, t) {
    return UA(e) && BA(t)
      ? WA(HA(e), t)
      : function (r) {
          var n = VA(r, e);
          return n === void 0 && n === t ? XA(r, e) : GA(t, n, jA | KA);
        };
  }
  cc.exports = YA;
});
var Pt = c((Ax, fc) => {
  function zA(e) {
    return e;
  }
  fc.exports = zA;
});
var an = c((Sx, dc) => {
  function kA(e) {
    return function (t) {
      return t?.[e];
    };
  }
  dc.exports = kA;
});
var Ec = c((Cx, pc) => {
  var QA = mt();
  function $A(e) {
    return function (t) {
      return QA(t, e);
    };
  }
  pc.exports = $A;
});
var gc = c((Rx, _c) => {
  var ZA = an(),
    JA = Ec(),
    eS = Rt(),
    tS = Re();
  function rS(e) {
    return eS(e) ? ZA(tS(e)) : JA(e);
  }
  _c.exports = rS;
});
var re = c((mx, Ic) => {
  var nS = Fs(),
    iS = lc(),
    oS = Pt(),
    uS = w(),
    aS = gc();
  function sS(e) {
    return typeof e == "function"
      ? e
      : e == null
      ? oS
      : typeof e == "object"
      ? uS(e)
        ? iS(e[0], e[1])
        : nS(e)
      : aS(e);
  }
  Ic.exports = sS;
});
var sn = c((Nx, hc) => {
  var cS = re(),
    lS = ae(),
    fS = Ye();
  function dS(e) {
    return function (t, r, n) {
      var i = Object(t);
      if (!lS(t)) {
        var o = cS(r, 3);
        (t = fS(t)),
          (r = function (a) {
            return o(i[a], a, i);
          });
      }
      var u = e(t, r, n);
      return u > -1 ? i[o ? t[u] : u] : void 0;
    };
  }
  hc.exports = dS;
});
var cn = c((Px, Tc) => {
  function pS(e, t, r, n) {
    for (var i = e.length, o = r + (n ? 1 : -1); n ? o-- : ++o < i; )
      if (t(e[o], o, e)) return o;
    return -1;
  }
  Tc.exports = pS;
});
var Oc = c((bx, yc) => {
  var ES = /\s/;
  function _S(e) {
    for (var t = e.length; t-- && ES.test(e.charAt(t)); );
    return t;
  }
  yc.exports = _S;
});
var Ac = c((Lx, vc) => {
  var gS = Oc(),
    IS = /^\s+/;
  function hS(e) {
    return e && e.slice(0, gS(e) + 1).replace(IS, "");
  }
  vc.exports = hS;
});
var bt = c((Dx, Rc) => {
  var TS = Ac(),
    Sc = K(),
    yS = ze(),
    Cc = 0 / 0,
    OS = /^[-+]0x[0-9a-f]+$/i,
    vS = /^0b[01]+$/i,
    AS = /^0o[0-7]+$/i,
    SS = parseInt;
  function CS(e) {
    if (typeof e == "number") return e;
    if (yS(e)) return Cc;
    if (Sc(e)) {
      var t = typeof e.valueOf == "function" ? e.valueOf() : e;
      e = Sc(t) ? t + "" : t;
    }
    if (typeof e != "string") return e === 0 ? e : +e;
    e = TS(e);
    var r = vS.test(e);
    return r || AS.test(e) ? SS(e.slice(2), r ? 2 : 8) : OS.test(e) ? Cc : +e;
  }
  Rc.exports = CS;
});
var Pc = c((Mx, Nc) => {
  var RS = bt(),
    mc = 1 / 0,
    mS = 17976931348623157e292;
  function NS(e) {
    if (!e) return e === 0 ? e : 0;
    if (((e = RS(e)), e === mc || e === -mc)) {
      var t = e < 0 ? -1 : 1;
      return t * mS;
    }
    return e === e ? e : 0;
  }
  Nc.exports = NS;
});
var ln = c((Fx, bc) => {
  var PS = Pc();
  function bS(e) {
    var t = PS(e),
      r = t % 1;
    return t === t ? (r ? t - r : t) : 0;
  }
  bc.exports = bS;
});
var Dc = c((qx, Lc) => {
  var LS = cn(),
    DS = re(),
    MS = ln(),
    FS = Math.max;
  function qS(e, t, r) {
    var n = e == null ? 0 : e.length;
    if (!n) return -1;
    var i = r == null ? 0 : MS(r);
    return i < 0 && (i = FS(n + i, 0)), LS(e, DS(t, 3), i);
  }
  Lc.exports = qS;
});
var fn = c((wx, Mc) => {
  var wS = sn(),
    xS = Dc(),
    GS = wS(xS);
  Mc.exports = GS;
});
var Dt = c((dn) => {
  "use strict";
  Object.defineProperty(dn, "__esModule", { value: !0 });
  function VS(e, t) {
    for (var r in t) Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
  }
  VS(dn, {
    ELEMENT_MATCHES: function () {
      return BS;
    },
    FLEX_PREFIXED: function () {
      return WS;
    },
    IS_BROWSER_ENV: function () {
      return qc;
    },
    TRANSFORM_PREFIXED: function () {
      return wc;
    },
    TRANSFORM_STYLE_PREFIXED: function () {
      return HS;
    },
    withBrowser: function () {
      return Lt;
    },
  });
  var XS = US(fn());
  function US(e) {
    return e && e.__esModule ? e : { default: e };
  }
  var qc = typeof window < "u",
    Lt = (e, t) => (qc ? e() : t),
    BS = Lt(() =>
      (0, XS.default)(
        [
          "matches",
          "matchesSelector",
          "mozMatchesSelector",
          "msMatchesSelector",
          "oMatchesSelector",
          "webkitMatchesSelector",
        ],
        (e) => e in Element.prototype
      )
    ),
    WS = Lt(() => {
      let e = document.createElement("i"),
        t = ["flex", "-webkit-flex", "-ms-flexbox", "-moz-box", "-webkit-box"],
        r = "";
      try {
        let { length: n } = t;
        for (let i = 0; i < n; i++) {
          let o = t[i];
          if (((e.style.display = o), e.style.display === o)) return o;
        }
        return r;
      } catch {
        return r;
      }
    }, "flex"),
    wc = Lt(() => {
      let e = document.createElement("i");
      if (e.style.transform == null) {
        let t = ["Webkit", "Moz", "ms"],
          r = "Transform",
          { length: n } = t;
        for (let i = 0; i < n; i++) {
          let o = t[i] + r;
          if (e.style[o] !== void 0) return o;
        }
      }
      return "transform";
    }, "transform"),
    Fc = wc.split("transform")[0],
    HS = Fc ? Fc + "TransformStyle" : "transformStyle";
});
var pn = c((Gx, Uc) => {
  var jS = 4,
    KS = 0.001,
    YS = 1e-7,
    zS = 10,
    Qe = 11,
    Mt = 1 / (Qe - 1),
    kS = typeof Float32Array == "function";
  function xc(e, t) {
    return 1 - 3 * t + 3 * e;
  }
  function Gc(e, t) {
    return 3 * t - 6 * e;
  }
  function Vc(e) {
    return 3 * e;
  }
  function Ft(e, t, r) {
    return ((xc(t, r) * e + Gc(t, r)) * e + Vc(t)) * e;
  }
  function Xc(e, t, r) {
    return 3 * xc(t, r) * e * e + 2 * Gc(t, r) * e + Vc(t);
  }
  function QS(e, t, r, n, i) {
    var o,
      u,
      a = 0;
    do (u = t + (r - t) / 2), (o = Ft(u, n, i) - e), o > 0 ? (r = u) : (t = u);
    while (Math.abs(o) > YS && ++a < zS);
    return u;
  }
  function $S(e, t, r, n) {
    for (var i = 0; i < jS; ++i) {
      var o = Xc(t, r, n);
      if (o === 0) return t;
      var u = Ft(t, r, n) - e;
      t -= u / o;
    }
    return t;
  }
  Uc.exports = function (t, r, n, i) {
    if (!(0 <= t && t <= 1 && 0 <= n && n <= 1))
      throw new Error("bezier x values must be in [0, 1] range");
    var o = kS ? new Float32Array(Qe) : new Array(Qe);
    if (t !== r || n !== i)
      for (var u = 0; u < Qe; ++u) o[u] = Ft(u * Mt, t, n);
    function a(s) {
      for (var l = 0, d = 1, p = Qe - 1; d !== p && o[d] <= s; ++d) l += Mt;
      --d;
      var f = (s - o[d]) / (o[d + 1] - o[d]),
        E = l + f * Mt,
        g = Xc(E, t, n);
      return g >= KS ? $S(s, E, t, n) : g === 0 ? E : QS(s, l, l + Mt, t, n);
    }
    return function (l) {
      return t === r && n === i
        ? l
        : l === 0
        ? 0
        : l === 1
        ? 1
        : Ft(a(l), r, i);
    };
  };
});
var _n = c((En) => {
  "use strict";
  Object.defineProperty(En, "__esModule", { value: !0 });
  function ZS(e, t) {
    for (var r in t) Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
  }
  ZS(En, {
    bounce: function () {
      return q0;
    },
    bouncePast: function () {
      return w0;
    },
    ease: function () {
      return e0;
    },
    easeIn: function () {
      return t0;
    },
    easeInOut: function () {
      return n0;
    },
    easeOut: function () {
      return r0;
    },
    inBack: function () {
      return R0;
    },
    inCirc: function () {
      return v0;
    },
    inCubic: function () {
      return a0;
    },
    inElastic: function () {
      return P0;
    },
    inExpo: function () {
      return T0;
    },
    inOutBack: function () {
      return N0;
    },
    inOutCirc: function () {
      return S0;
    },
    inOutCubic: function () {
      return c0;
    },
    inOutElastic: function () {
      return L0;
    },
    inOutExpo: function () {
      return O0;
    },
    inOutQuad: function () {
      return u0;
    },
    inOutQuart: function () {
      return d0;
    },
    inOutQuint: function () {
      return _0;
    },
    inOutSine: function () {
      return h0;
    },
    inQuad: function () {
      return i0;
    },
    inQuart: function () {
      return l0;
    },
    inQuint: function () {
      return p0;
    },
    inSine: function () {
      return g0;
    },
    outBack: function () {
      return m0;
    },
    outBounce: function () {
      return C0;
    },
    outCirc: function () {
      return A0;
    },
    outCubic: function () {
      return s0;
    },
    outElastic: function () {
      return b0;
    },
    outExpo: function () {
      return y0;
    },
    outQuad: function () {
      return o0;
    },
    outQuart: function () {
      return f0;
    },
    outQuint: function () {
      return E0;
    },
    outSine: function () {
      return I0;
    },
    swingFrom: function () {
      return M0;
    },
    swingFromTo: function () {
      return D0;
    },
    swingTo: function () {
      return F0;
    },
  });
  var qt = JS(pn());
  function JS(e) {
    return e && e.__esModule ? e : { default: e };
  }
  var Z = 1.70158,
    e0 = (0, qt.default)(0.25, 0.1, 0.25, 1),
    t0 = (0, qt.default)(0.42, 0, 1, 1),
    r0 = (0, qt.default)(0, 0, 0.58, 1),
    n0 = (0, qt.default)(0.42, 0, 0.58, 1);
  function i0(e) {
    return Math.pow(e, 2);
  }
  function o0(e) {
    return -(Math.pow(e - 1, 2) - 1);
  }
  function u0(e) {
    return (e /= 0.5) < 1 ? 0.5 * Math.pow(e, 2) : -0.5 * ((e -= 2) * e - 2);
  }
  function a0(e) {
    return Math.pow(e, 3);
  }
  function s0(e) {
    return Math.pow(e - 1, 3) + 1;
  }
  function c0(e) {
    return (e /= 0.5) < 1
      ? 0.5 * Math.pow(e, 3)
      : 0.5 * (Math.pow(e - 2, 3) + 2);
  }
  function l0(e) {
    return Math.pow(e, 4);
  }
  function f0(e) {
    return -(Math.pow(e - 1, 4) - 1);
  }
  function d0(e) {
    return (e /= 0.5) < 1
      ? 0.5 * Math.pow(e, 4)
      : -0.5 * ((e -= 2) * Math.pow(e, 3) - 2);
  }
  function p0(e) {
    return Math.pow(e, 5);
  }
  function E0(e) {
    return Math.pow(e - 1, 5) + 1;
  }
  function _0(e) {
    return (e /= 0.5) < 1
      ? 0.5 * Math.pow(e, 5)
      : 0.5 * (Math.pow(e - 2, 5) + 2);
  }
  function g0(e) {
    return -Math.cos(e * (Math.PI / 2)) + 1;
  }
  function I0(e) {
    return Math.sin(e * (Math.PI / 2));
  }
  function h0(e) {
    return -0.5 * (Math.cos(Math.PI * e) - 1);
  }
  function T0(e) {
    return e === 0 ? 0 : Math.pow(2, 10 * (e - 1));
  }
  function y0(e) {
    return e === 1 ? 1 : -Math.pow(2, -10 * e) + 1;
  }
  function O0(e) {
    return e === 0
      ? 0
      : e === 1
      ? 1
      : (e /= 0.5) < 1
      ? 0.5 * Math.pow(2, 10 * (e - 1))
      : 0.5 * (-Math.pow(2, -10 * --e) + 2);
  }
  function v0(e) {
    return -(Math.sqrt(1 - e * e) - 1);
  }
  function A0(e) {
    return Math.sqrt(1 - Math.pow(e - 1, 2));
  }
  function S0(e) {
    return (e /= 0.5) < 1
      ? -0.5 * (Math.sqrt(1 - e * e) - 1)
      : 0.5 * (Math.sqrt(1 - (e -= 2) * e) + 1);
  }
  function C0(e) {
    return e < 1 / 2.75
      ? 7.5625 * e * e
      : e < 2 / 2.75
      ? 7.5625 * (e -= 1.5 / 2.75) * e + 0.75
      : e < 2.5 / 2.75
      ? 7.5625 * (e -= 2.25 / 2.75) * e + 0.9375
      : 7.5625 * (e -= 2.625 / 2.75) * e + 0.984375;
  }
  function R0(e) {
    let t = Z;
    return e * e * ((t + 1) * e - t);
  }
  function m0(e) {
    let t = Z;
    return (e -= 1) * e * ((t + 1) * e + t) + 1;
  }
  function N0(e) {
    let t = Z;
    return (e /= 0.5) < 1
      ? 0.5 * (e * e * (((t *= 1.525) + 1) * e - t))
      : 0.5 * ((e -= 2) * e * (((t *= 1.525) + 1) * e + t) + 2);
  }
  function P0(e) {
    let t = Z,
      r = 0,
      n = 1;
    return e === 0
      ? 0
      : e === 1
      ? 1
      : (r || (r = 0.3),
        n < 1
          ? ((n = 1), (t = r / 4))
          : (t = (r / (2 * Math.PI)) * Math.asin(1 / n)),
        -(
          n *
          Math.pow(2, 10 * (e -= 1)) *
          Math.sin(((e - t) * (2 * Math.PI)) / r)
        ));
  }
  function b0(e) {
    let t = Z,
      r = 0,
      n = 1;
    return e === 0
      ? 0
      : e === 1
      ? 1
      : (r || (r = 0.3),
        n < 1
          ? ((n = 1), (t = r / 4))
          : (t = (r / (2 * Math.PI)) * Math.asin(1 / n)),
        n * Math.pow(2, -10 * e) * Math.sin(((e - t) * (2 * Math.PI)) / r) + 1);
  }
  function L0(e) {
    let t = Z,
      r = 0,
      n = 1;
    return e === 0
      ? 0
      : (e /= 1 / 2) === 2
      ? 1
      : (r || (r = 0.3 * 1.5),
        n < 1
          ? ((n = 1), (t = r / 4))
          : (t = (r / (2 * Math.PI)) * Math.asin(1 / n)),
        e < 1
          ? -0.5 *
            (n *
              Math.pow(2, 10 * (e -= 1)) *
              Math.sin(((e - t) * (2 * Math.PI)) / r))
          : n *
              Math.pow(2, -10 * (e -= 1)) *
              Math.sin(((e - t) * (2 * Math.PI)) / r) *
              0.5 +
            1);
  }
  function D0(e) {
    let t = Z;
    return (e /= 0.5) < 1
      ? 0.5 * (e * e * (((t *= 1.525) + 1) * e - t))
      : 0.5 * ((e -= 2) * e * (((t *= 1.525) + 1) * e + t) + 2);
  }
  function M0(e) {
    let t = Z;
    return e * e * ((t + 1) * e - t);
  }
  function F0(e) {
    let t = Z;
    return (e -= 1) * e * ((t + 1) * e + t) + 1;
  }
  function q0(e) {
    return e < 1 / 2.75
      ? 7.5625 * e * e
      : e < 2 / 2.75
      ? 7.5625 * (e -= 1.5 / 2.75) * e + 0.75
      : e < 2.5 / 2.75
      ? 7.5625 * (e -= 2.25 / 2.75) * e + 0.9375
      : 7.5625 * (e -= 2.625 / 2.75) * e + 0.984375;
  }
  function w0(e) {
    return e < 1 / 2.75
      ? 7.5625 * e * e
      : e < 2 / 2.75
      ? 2 - (7.5625 * (e -= 1.5 / 2.75) * e + 0.75)
      : e < 2.5 / 2.75
      ? 2 - (7.5625 * (e -= 2.25 / 2.75) * e + 0.9375)
      : 2 - (7.5625 * (e -= 2.625 / 2.75) * e + 0.984375);
  }
});
var hn = c((In) => {
  "use strict";
  Object.defineProperty(In, "__esModule", { value: !0 });
  function x0(e, t) {
    for (var r in t) Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
  }
  x0(In, {
    applyEasing: function () {
      return B0;
    },
    createBezierEasing: function () {
      return U0;
    },
    optimizeFloat: function () {
      return gn;
    },
  });
  var Bc = X0(_n()),
    G0 = V0(pn());
  function V0(e) {
    return e && e.__esModule ? e : { default: e };
  }
  function Wc(e) {
    if (typeof WeakMap != "function") return null;
    var t = new WeakMap(),
      r = new WeakMap();
    return (Wc = function (n) {
      return n ? r : t;
    })(e);
  }
  function X0(e, t) {
    if (!t && e && e.__esModule) return e;
    if (e === null || (typeof e != "object" && typeof e != "function"))
      return { default: e };
    var r = Wc(t);
    if (r && r.has(e)) return r.get(e);
    var n = { __proto__: null },
      i = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for (var o in e)
      if (o !== "default" && Object.prototype.hasOwnProperty.call(e, o)) {
        var u = i ? Object.getOwnPropertyDescriptor(e, o) : null;
        u && (u.get || u.set) ? Object.defineProperty(n, o, u) : (n[o] = e[o]);
      }
    return (n.default = e), r && r.set(e, n), n;
  }
  function gn(e, t = 5, r = 10) {
    let n = Math.pow(r, t),
      i = Number(Math.round(e * n) / n);
    return Math.abs(i) > 1e-4 ? i : 0;
  }
  function U0(e) {
    return (0, G0.default)(...e);
  }
  function B0(e, t, r) {
    return t === 0
      ? 0
      : t === 1
      ? 1
      : gn(r ? (t > 0 ? r(t) : t) : t > 0 && e && Bc[e] ? Bc[e](t) : t);
  }
});
var Yc = c((yn) => {
  "use strict";
  Object.defineProperty(yn, "__esModule", { value: !0 });
  function W0(e, t) {
    for (var r in t) Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
  }
  W0(yn, {
    createElementState: function () {
      return Kc;
    },
    ixElements: function () {
      return nC;
    },
    mergeActionState: function () {
      return Tn;
    },
  });
  var wt = he(),
    jc = G(),
    {
      HTML_ELEMENT: Ux,
      PLAIN_OBJECT: H0,
      ABSTRACT_NODE: Bx,
      CONFIG_X_VALUE: j0,
      CONFIG_Y_VALUE: K0,
      CONFIG_Z_VALUE: Y0,
      CONFIG_VALUE: z0,
      CONFIG_X_UNIT: k0,
      CONFIG_Y_UNIT: Q0,
      CONFIG_Z_UNIT: $0,
      CONFIG_UNIT: Z0,
    } = jc.IX2EngineConstants,
    {
      IX2_SESSION_STOPPED: J0,
      IX2_INSTANCE_ADDED: eC,
      IX2_ELEMENT_STATE_CHANGED: tC,
    } = jc.IX2EngineActionTypes,
    Hc = {},
    rC = "refState",
    nC = (e = Hc, t = {}) => {
      switch (t.type) {
        case J0:
          return Hc;
        case eC: {
          let {
              elementId: r,
              element: n,
              origin: i,
              actionItem: o,
              refType: u,
            } = t.payload,
            { actionTypeId: a } = o,
            s = e;
          return (
            (0, wt.getIn)(s, [r, n]) !== n && (s = Kc(s, n, u, r, o)),
            Tn(s, r, a, i, o)
          );
        }
        case tC: {
          let {
            elementId: r,
            actionTypeId: n,
            current: i,
            actionItem: o,
          } = t.payload;
          return Tn(e, r, n, i, o);
        }
        default:
          return e;
      }
    };
  function Kc(e, t, r, n, i) {
    let o =
      r === H0 ? (0, wt.getIn)(i, ["config", "target", "objectId"]) : null;
    return (0, wt.mergeIn)(e, [n], { id: n, ref: t, refId: o, refType: r });
  }
  function Tn(e, t, r, n, i) {
    let o = oC(i),
      u = [t, rC, r];
    return (0, wt.mergeIn)(e, u, n, o);
  }
  var iC = [
    [j0, k0],
    [K0, Q0],
    [Y0, $0],
    [z0, Z0],
  ];
  function oC(e) {
    let { config: t } = e;
    return iC.reduce((r, n) => {
      let i = n[0],
        o = n[1],
        u = t[i],
        a = t[o];
      return u != null && a != null && (r[o] = a), r;
    }, {});
  }
});
var zc = c((On) => {
  "use strict";
  Object.defineProperty(On, "__esModule", { value: !0 });
  function uC(e, t) {
    for (var r in t) Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
  }
  uC(On, {
    clearPlugin: function () {
      return pC;
    },
    createPluginInstance: function () {
      return fC;
    },
    getPluginConfig: function () {
      return aC;
    },
    getPluginDestination: function () {
      return lC;
    },
    getPluginDuration: function () {
      return sC;
    },
    getPluginOrigin: function () {
      return cC;
    },
    renderPlugin: function () {
      return dC;
    },
  });
  var aC = (e) => e.value,
    sC = (e, t) => {
      if (t.config.duration !== "auto") return null;
      let r = parseFloat(e.getAttribute("data-duration"));
      return r > 0
        ? r * 1e3
        : parseFloat(e.getAttribute("data-default-duration")) * 1e3;
    },
    cC = (e) => e || { value: 0 },
    lC = (e) => ({ value: e.value }),
    fC = (e) => {
      let t = window.Webflow.require("lottie");
      if (!t) return null;
      let r = t.createInstance(e);
      return r.stop(), r.setSubframe(!0), r;
    },
    dC = (e, t, r) => {
      if (!e) return;
      let n = t[r.actionTypeId].value / 100;
      e.goToFrame(e.frames * n);
    },
    pC = (e) => {
      let t = window.Webflow.require("lottie");
      t && t.createInstance(e).stop();
    };
});
var Qc = c((vn) => {
  "use strict";
  Object.defineProperty(vn, "__esModule", { value: !0 });
  function EC(e, t) {
    for (var r in t) Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
  }
  EC(vn, {
    clearPlugin: function () {
      return SC;
    },
    createPluginInstance: function () {
      return vC;
    },
    getPluginConfig: function () {
      return hC;
    },
    getPluginDestination: function () {
      return OC;
    },
    getPluginDuration: function () {
      return TC;
    },
    getPluginOrigin: function () {
      return yC;
    },
    renderPlugin: function () {
      return AC;
    },
  });
  var _C = (e) => document.querySelector(`[data-w-id="${e}"]`),
    gC = () => window.Webflow.require("spline"),
    IC = (e, t) => e.filter((r) => !t.includes(r)),
    hC = (e, t) => e.value[t],
    TC = () => null,
    kc = Object.freeze({
      positionX: 0,
      positionY: 0,
      positionZ: 0,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
    }),
    yC = (e, t) => {
      let r = t.config.value,
        n = Object.keys(r);
      if (e) {
        let o = Object.keys(e),
          u = IC(n, o);
        return u.length ? u.reduce((s, l) => ((s[l] = kc[l]), s), e) : e;
      }
      return n.reduce((o, u) => ((o[u] = kc[u]), o), {});
    },
    OC = (e) => e.value,
    vC = (e, t) => {
      let r = t?.config?.target?.pluginElement;
      return r ? _C(r) : null;
    },
    AC = (e, t, r) => {
      let n = gC();
      if (!n) return;
      let i = n.getInstance(e),
        o = r.config.target.objectId,
        u = (a) => {
          if (!a) throw new Error("Invalid spline app passed to renderSpline");
          let s = o && a.findObjectById(o);
          if (!s) return;
          let { PLUGIN_SPLINE: l } = t;
          l.positionX != null && (s.position.x = l.positionX),
            l.positionY != null && (s.position.y = l.positionY),
            l.positionZ != null && (s.position.z = l.positionZ),
            l.rotationX != null && (s.rotation.x = l.rotationX),
            l.rotationY != null && (s.rotation.y = l.rotationY),
            l.rotationZ != null && (s.rotation.z = l.rotationZ),
            l.scaleX != null && (s.scale.x = l.scaleX),
            l.scaleY != null && (s.scale.y = l.scaleY),
            l.scaleZ != null && (s.scale.z = l.scaleZ);
        };
      i ? u(i.spline) : n.setLoadHandler(e, u);
    },
    SC = () => null;
});
var $c = c((Cn) => {
  "use strict";
  Object.defineProperty(Cn, "__esModule", { value: !0 });
  function CC(e, t) {
    for (var r in t) Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
  }
  CC(Cn, {
    clearPlugin: function () {
      return FC;
    },
    createPluginInstance: function () {
      return DC;
    },
    getPluginConfig: function () {
      return NC;
    },
    getPluginDestination: function () {
      return LC;
    },
    getPluginDuration: function () {
      return PC;
    },
    getPluginOrigin: function () {
      return bC;
    },
    renderPlugin: function () {
      return MC;
    },
  });
  var An = "--wf-rive-fit",
    Sn = "--wf-rive-alignment",
    RC = (e) => document.querySelector(`[data-w-id="${e}"]`),
    mC = () => window.Webflow.require("rive"),
    NC = (e, t) => e.value.inputs[t],
    PC = () => null,
    bC = (e, t) => {
      if (e) return e;
      let r = {},
        { inputs: n = {} } = t.config.value;
      for (let i in n) n[i] == null && (r[i] = 0);
      return r;
    },
    LC = (e) => e.value.inputs ?? {},
    DC = (e, t) => {
      if ((t.config?.target?.selectorGuids || []).length > 0) return e;
      let n = t?.config?.target?.pluginElement;
      return n ? RC(n) : null;
    },
    MC = (e, { PLUGIN_RIVE: t }, r) => {
      let n = mC();
      if (!n) return;
      let i = n.getInstance(e),
        o = n.rive.StateMachineInputType,
        { name: u, inputs: a = {} } = r.config.value || {};
      function s(l) {
        if (l.loaded) d();
        else {
          let p = () => {
            d(), l?.off("load", p);
          };
          l?.on("load", p);
        }
        function d() {
          let p = l.stateMachineInputs(u);
          if (p != null) {
            if ((l.isPlaying || l.play(u, !1), An in a || Sn in a)) {
              let f = l.layout,
                E = a[An] ?? f.fit,
                g = a[Sn] ?? f.alignment;
              (E !== f.fit || g !== f.alignment) &&
                (l.layout = f.copyWith({ fit: E, alignment: g }));
            }
            for (let f in a) {
              if (f === An || f === Sn) continue;
              let E = p.find((g) => g.name === f);
              if (E != null)
                switch (E.type) {
                  case o.Boolean: {
                    if (a[f] != null) {
                      let g = !!a[f];
                      E.value = g;
                    }
                    break;
                  }
                  case o.Number: {
                    let g = t[f];
                    g != null && (E.value = g);
                    break;
                  }
                  case o.Trigger: {
                    a[f] && E.fire();
                    break;
                  }
                }
            }
          }
        }
      }
      i?.rive ? s(i.rive) : n.setLoadHandler(e, s);
    },
    FC = (e, t) => null;
});
var mn = c((Rn) => {
  "use strict";
  Object.defineProperty(Rn, "__esModule", { value: !0 });
  Object.defineProperty(Rn, "normalizeColor", {
    enumerable: !0,
    get: function () {
      return qC;
    },
  });
  var Zc = {
    aliceblue: "#F0F8FF",
    antiquewhite: "#FAEBD7",
    aqua: "#00FFFF",
    aquamarine: "#7FFFD4",
    azure: "#F0FFFF",
    beige: "#F5F5DC",
    bisque: "#FFE4C4",
    black: "#000000",
    blanchedalmond: "#FFEBCD",
    blue: "#0000FF",
    blueviolet: "#8A2BE2",
    brown: "#A52A2A",
    burlywood: "#DEB887",
    cadetblue: "#5F9EA0",
    chartreuse: "#7FFF00",
    chocolate: "#D2691E",
    coral: "#FF7F50",
    cornflowerblue: "#6495ED",
    cornsilk: "#FFF8DC",
    crimson: "#DC143C",
    cyan: "#00FFFF",
    darkblue: "#00008B",
    darkcyan: "#008B8B",
    darkgoldenrod: "#B8860B",
    darkgray: "#A9A9A9",
    darkgreen: "#006400",
    darkgrey: "#A9A9A9",
    darkkhaki: "#BDB76B",
    darkmagenta: "#8B008B",
    darkolivegreen: "#556B2F",
    darkorange: "#FF8C00",
    darkorchid: "#9932CC",
    darkred: "#8B0000",
    darksalmon: "#E9967A",
    darkseagreen: "#8FBC8F",
    darkslateblue: "#483D8B",
    darkslategray: "#2F4F4F",
    darkslategrey: "#2F4F4F",
    darkturquoise: "#00CED1",
    darkviolet: "#9400D3",
    deeppink: "#FF1493",
    deepskyblue: "#00BFFF",
    dimgray: "#696969",
    dimgrey: "#696969",
    dodgerblue: "#1E90FF",
    firebrick: "#B22222",
    floralwhite: "#FFFAF0",
    forestgreen: "#228B22",
    fuchsia: "#FF00FF",
    gainsboro: "#DCDCDC",
    ghostwhite: "#F8F8FF",
    gold: "#FFD700",
    goldenrod: "#DAA520",
    gray: "#808080",
    green: "#008000",
    greenyellow: "#ADFF2F",
    grey: "#808080",
    honeydew: "#F0FFF0",
    hotpink: "#FF69B4",
    indianred: "#CD5C5C",
    indigo: "#4B0082",
    ivory: "#FFFFF0",
    khaki: "#F0E68C",
    lavender: "#E6E6FA",
    lavenderblush: "#FFF0F5",
    lawngreen: "#7CFC00",
    lemonchiffon: "#FFFACD",
    lightblue: "#ADD8E6",
    lightcoral: "#F08080",
    lightcyan: "#E0FFFF",
    lightgoldenrodyellow: "#FAFAD2",
    lightgray: "#D3D3D3",
    lightgreen: "#90EE90",
    lightgrey: "#D3D3D3",
    lightpink: "#FFB6C1",
    lightsalmon: "#FFA07A",
    lightseagreen: "#20B2AA",
    lightskyblue: "#87CEFA",
    lightslategray: "#778899",
    lightslategrey: "#778899",
    lightsteelblue: "#B0C4DE",
    lightyellow: "#FFFFE0",
    lime: "#00FF00",
    limegreen: "#32CD32",
    linen: "#FAF0E6",
    magenta: "#FF00FF",
    maroon: "#800000",
    mediumaquamarine: "#66CDAA",
    mediumblue: "#0000CD",
    mediumorchid: "#BA55D3",
    mediumpurple: "#9370DB",
    mediumseagreen: "#3CB371",
    mediumslateblue: "#7B68EE",
    mediumspringgreen: "#00FA9A",
    mediumturquoise: "#48D1CC",
    mediumvioletred: "#C71585",
    midnightblue: "#191970",
    mintcream: "#F5FFFA",
    mistyrose: "#FFE4E1",
    moccasin: "#FFE4B5",
    navajowhite: "#FFDEAD",
    navy: "#000080",
    oldlace: "#FDF5E6",
    olive: "#808000",
    olivedrab: "#6B8E23",
    orange: "#FFA500",
    orangered: "#FF4500",
    orchid: "#DA70D6",
    palegoldenrod: "#EEE8AA",
    palegreen: "#98FB98",
    paleturquoise: "#AFEEEE",
    palevioletred: "#DB7093",
    papayawhip: "#FFEFD5",
    peachpuff: "#FFDAB9",
    peru: "#CD853F",
    pink: "#FFC0CB",
    plum: "#DDA0DD",
    powderblue: "#B0E0E6",
    purple: "#800080",
    rebeccapurple: "#663399",
    red: "#FF0000",
    rosybrown: "#BC8F8F",
    royalblue: "#4169E1",
    saddlebrown: "#8B4513",
    salmon: "#FA8072",
    sandybrown: "#F4A460",
    seagreen: "#2E8B57",
    seashell: "#FFF5EE",
    sienna: "#A0522D",
    silver: "#C0C0C0",
    skyblue: "#87CEEB",
    slateblue: "#6A5ACD",
    slategray: "#708090",
    slategrey: "#708090",
    snow: "#FFFAFA",
    springgreen: "#00FF7F",
    steelblue: "#4682B4",
    tan: "#D2B48C",
    teal: "#008080",
    thistle: "#D8BFD8",
    tomato: "#FF6347",
    turquoise: "#40E0D0",
    violet: "#EE82EE",
    wheat: "#F5DEB3",
    white: "#FFFFFF",
    whitesmoke: "#F5F5F5",
    yellow: "#FFFF00",
    yellowgreen: "#9ACD32",
  };
  function qC(e) {
    let t,
      r,
      n,
      i = 1,
      o = e.replace(/\s/g, "").toLowerCase(),
      a = (typeof Zc[o] == "string" ? Zc[o].toLowerCase() : null) || o;
    if (a.startsWith("#")) {
      let s = a.substring(1);
      s.length === 3 || s.length === 4
        ? ((t = parseInt(s[0] + s[0], 16)),
          (r = parseInt(s[1] + s[1], 16)),
          (n = parseInt(s[2] + s[2], 16)),
          s.length === 4 && (i = parseInt(s[3] + s[3], 16) / 255))
        : (s.length === 6 || s.length === 8) &&
          ((t = parseInt(s.substring(0, 2), 16)),
          (r = parseInt(s.substring(2, 4), 16)),
          (n = parseInt(s.substring(4, 6), 16)),
          s.length === 8 && (i = parseInt(s.substring(6, 8), 16) / 255));
    } else if (a.startsWith("rgba")) {
      let s = a.match(/rgba\(([^)]+)\)/)[1].split(",");
      (t = parseInt(s[0], 10)),
        (r = parseInt(s[1], 10)),
        (n = parseInt(s[2], 10)),
        (i = parseFloat(s[3]));
    } else if (a.startsWith("rgb")) {
      let s = a.match(/rgb\(([^)]+)\)/)[1].split(",");
      (t = parseInt(s[0], 10)),
        (r = parseInt(s[1], 10)),
        (n = parseInt(s[2], 10));
    } else if (a.startsWith("hsla")) {
      let s = a.match(/hsla\(([^)]+)\)/)[1].split(","),
        l = parseFloat(s[0]),
        d = parseFloat(s[1].replace("%", "")) / 100,
        p = parseFloat(s[2].replace("%", "")) / 100;
      i = parseFloat(s[3]);
      let f = (1 - Math.abs(2 * p - 1)) * d,
        E = f * (1 - Math.abs(((l / 60) % 2) - 1)),
        g = p - f / 2,
        _,
        h,
        I;
      l >= 0 && l < 60
        ? ((_ = f), (h = E), (I = 0))
        : l >= 60 && l < 120
        ? ((_ = E), (h = f), (I = 0))
        : l >= 120 && l < 180
        ? ((_ = 0), (h = f), (I = E))
        : l >= 180 && l < 240
        ? ((_ = 0), (h = E), (I = f))
        : l >= 240 && l < 300
        ? ((_ = E), (h = 0), (I = f))
        : ((_ = f), (h = 0), (I = E)),
        (t = Math.round((_ + g) * 255)),
        (r = Math.round((h + g) * 255)),
        (n = Math.round((I + g) * 255));
    } else if (a.startsWith("hsl")) {
      let s = a.match(/hsl\(([^)]+)\)/)[1].split(","),
        l = parseFloat(s[0]),
        d = parseFloat(s[1].replace("%", "")) / 100,
        p = parseFloat(s[2].replace("%", "")) / 100,
        f = (1 - Math.abs(2 * p - 1)) * d,
        E = f * (1 - Math.abs(((l / 60) % 2) - 1)),
        g = p - f / 2,
        _,
        h,
        I;
      l >= 0 && l < 60
        ? ((_ = f), (h = E), (I = 0))
        : l >= 60 && l < 120
        ? ((_ = E), (h = f), (I = 0))
        : l >= 120 && l < 180
        ? ((_ = 0), (h = f), (I = E))
        : l >= 180 && l < 240
        ? ((_ = 0), (h = E), (I = f))
        : l >= 240 && l < 300
        ? ((_ = E), (h = 0), (I = f))
        : ((_ = f), (h = 0), (I = E)),
        (t = Math.round((_ + g) * 255)),
        (r = Math.round((h + g) * 255)),
        (n = Math.round((I + g) * 255));
    }
    if (Number.isNaN(t) || Number.isNaN(r) || Number.isNaN(n))
      throw new Error(
        `Invalid color in [ix2/shared/utils/normalizeColor.js] '${e}'`
      );
    return { red: t, green: r, blue: n, alpha: i };
  }
});
var Jc = c((Nn) => {
  "use strict";
  Object.defineProperty(Nn, "__esModule", { value: !0 });
  function wC(e, t) {
    for (var r in t) Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
  }
  wC(Nn, {
    clearPlugin: function () {
      return jC;
    },
    createPluginInstance: function () {
      return BC;
    },
    getPluginConfig: function () {
      return GC;
    },
    getPluginDestination: function () {
      return UC;
    },
    getPluginDuration: function () {
      return VC;
    },
    getPluginOrigin: function () {
      return XC;
    },
    renderPlugin: function () {
      return HC;
    },
  });
  var xC = mn(),
    GC = (e, t) => e.value[t],
    VC = () => null,
    XC = (e, t) => {
      if (e) return e;
      let r = t.config.value,
        n = t.config.target.objectId,
        i = getComputedStyle(document.documentElement).getPropertyValue(n);
      if (r.size != null) return { size: parseInt(i, 10) };
      if (r.unit === "%" || r.unit === "-") return { size: parseFloat(i) };
      if (r.red != null && r.green != null && r.blue != null)
        return (0, xC.normalizeColor)(i);
    },
    UC = (e) => e.value,
    BC = () => null,
    WC = {
      color: {
        match: ({ red: e, green: t, blue: r, alpha: n }) =>
          [e, t, r, n].every((i) => i != null),
        getValue: ({ red: e, green: t, blue: r, alpha: n }) =>
          `rgba(${e}, ${t}, ${r}, ${n})`,
      },
      size: {
        match: ({ size: e }) => e != null,
        getValue: ({ size: e }, t) => {
          switch (t) {
            case "-":
              return e;
            default:
              return `${e}${t}`;
          }
        },
      },
    },
    HC = (e, t, r) => {
      let {
          target: { objectId: n },
          value: { unit: i },
        } = r.config,
        o = t.PLUGIN_VARIABLE,
        u = Object.values(WC).find((a) => a.match(o, i));
      u && document.documentElement.style.setProperty(n, u.getValue(o, i));
    },
    jC = (e, t) => {
      let r = t.config.target.objectId;
      document.documentElement.style.removeProperty(r);
    };
});
var tl = c((Pn) => {
  "use strict";
  Object.defineProperty(Pn, "__esModule", { value: !0 });
  Object.defineProperty(Pn, "pluginMethodMap", {
    enumerable: !0,
    get: function () {
      return QC;
    },
  });
  var xt = G(),
    KC = Gt(zc()),
    YC = Gt(Qc()),
    zC = Gt($c()),
    kC = Gt(Jc());
  function el(e) {
    if (typeof WeakMap != "function") return null;
    var t = new WeakMap(),
      r = new WeakMap();
    return (el = function (n) {
      return n ? r : t;
    })(e);
  }
  function Gt(e, t) {
    if (!t && e && e.__esModule) return e;
    if (e === null || (typeof e != "object" && typeof e != "function"))
      return { default: e };
    var r = el(t);
    if (r && r.has(e)) return r.get(e);
    var n = { __proto__: null },
      i = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for (var o in e)
      if (o !== "default" && Object.prototype.hasOwnProperty.call(e, o)) {
        var u = i ? Object.getOwnPropertyDescriptor(e, o) : null;
        u && (u.get || u.set) ? Object.defineProperty(n, o, u) : (n[o] = e[o]);
      }
    return (n.default = e), r && r.set(e, n), n;
  }
  var QC = new Map([
    [xt.ActionTypeConsts.PLUGIN_LOTTIE, { ...KC }],
    [xt.ActionTypeConsts.PLUGIN_SPLINE, { ...YC }],
    [xt.ActionTypeConsts.PLUGIN_RIVE, { ...zC }],
    [xt.ActionTypeConsts.PLUGIN_VARIABLE, { ...kC }],
  ]);
});
var Ln = c((bn) => {
  "use strict";
  Object.defineProperty(bn, "__esModule", { value: !0 });
  function $C(e, t) {
    for (var r in t) Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
  }
  $C(bn, {
    clearPlugin: function () {
      return uR;
    },
    createPluginInstance: function () {
      return iR;
    },
    getPluginConfig: function () {
      return eR;
    },
    getPluginDestination: function () {
      return nR;
    },
    getPluginDuration: function () {
      return rR;
    },
    getPluginOrigin: function () {
      return tR;
    },
    isPluginType: function () {
      return JC;
    },
    renderPlugin: function () {
      return oR;
    },
  });
  var ZC = Dt(),
    rl = tl();
  function JC(e) {
    return rl.pluginMethodMap.has(e);
  }
  var ce = (e) => (t) => {
      if (!ZC.IS_BROWSER_ENV) return () => null;
      let r = rl.pluginMethodMap.get(t);
      if (!r) throw new Error(`IX2 no plugin configured for: ${t}`);
      let n = r[e];
      if (!n) throw new Error(`IX2 invalid plugin method: ${e}`);
      return n;
    },
    eR = ce("getPluginConfig"),
    tR = ce("getPluginOrigin"),
    rR = ce("getPluginDuration"),
    nR = ce("getPluginDestination"),
    iR = ce("createPluginInstance"),
    oR = ce("renderPlugin"),
    uR = ce("clearPlugin");
});
var il = c(($x, nl) => {
  function aR(e, t) {
    return e == null || e !== e ? t : e;
  }
  nl.exports = aR;
});
var ul = c((Zx, ol) => {
  function sR(e, t, r, n) {
    var i = -1,
      o = e == null ? 0 : e.length;
    for (n && o && (r = e[++i]); ++i < o; ) r = t(r, e[i], i, e);
    return r;
  }
  ol.exports = sR;
});
var sl = c((Jx, al) => {
  function cR(e) {
    return function (t, r, n) {
      for (var i = -1, o = Object(t), u = n(t), a = u.length; a--; ) {
        var s = u[e ? a : ++i];
        if (r(o[s], s, o) === !1) break;
      }
      return t;
    };
  }
  al.exports = cR;
});
var ll = c((e2, cl) => {
  var lR = sl(),
    fR = lR();
  cl.exports = fR;
});
var Dn = c((t2, fl) => {
  var dR = ll(),
    pR = Ye();
  function ER(e, t) {
    return e && dR(e, t, pR);
  }
  fl.exports = ER;
});
var pl = c((r2, dl) => {
  var _R = ae();
  function gR(e, t) {
    return function (r, n) {
      if (r == null) return r;
      if (!_R(r)) return e(r, n);
      for (
        var i = r.length, o = t ? i : -1, u = Object(r);
        (t ? o-- : ++o < i) && n(u[o], o, u) !== !1;

      );
      return r;
    };
  }
  dl.exports = gR;
});
var Mn = c((n2, El) => {
  var IR = Dn(),
    hR = pl(),
    TR = hR(IR);
  El.exports = TR;
});
var gl = c((i2, _l) => {
  function yR(e, t, r, n, i) {
    return (
      i(e, function (o, u, a) {
        r = n ? ((n = !1), o) : t(r, o, u, a);
      }),
      r
    );
  }
  _l.exports = yR;
});
var hl = c((o2, Il) => {
  var OR = ul(),
    vR = Mn(),
    AR = re(),
    SR = gl(),
    CR = w();
  function RR(e, t, r) {
    var n = CR(e) ? OR : SR,
      i = arguments.length < 3;
    return n(e, AR(t, 4), r, i, vR);
  }
  Il.exports = RR;
});
var yl = c((u2, Tl) => {
  var mR = cn(),
    NR = re(),
    PR = ln(),
    bR = Math.max,
    LR = Math.min;
  function DR(e, t, r) {
    var n = e == null ? 0 : e.length;
    if (!n) return -1;
    var i = n - 1;
    return (
      r !== void 0 && ((i = PR(r)), (i = r < 0 ? bR(n + i, 0) : LR(i, n - 1))),
      mR(e, NR(t, 3), i, !0)
    );
  }
  Tl.exports = DR;
});
var vl = c((a2, Ol) => {
  var MR = sn(),
    FR = yl(),
    qR = MR(FR);
  Ol.exports = qR;
});
var Sl = c((Fn) => {
  "use strict";
  Object.defineProperty(Fn, "__esModule", { value: !0 });
  Object.defineProperty(Fn, "default", {
    enumerable: !0,
    get: function () {
      return xR;
    },
  });
  function Al(e, t) {
    return e === t ? e !== 0 || t !== 0 || 1 / e === 1 / t : e !== e && t !== t;
  }
  function wR(e, t) {
    if (Al(e, t)) return !0;
    if (
      typeof e != "object" ||
      e === null ||
      typeof t != "object" ||
      t === null
    )
      return !1;
    let r = Object.keys(e),
      n = Object.keys(t);
    if (r.length !== n.length) return !1;
    for (let i = 0; i < r.length; i++)
      if (!Object.hasOwn(t, r[i]) || !Al(e[r[i]], t[r[i]])) return !1;
    return !0;
  }
  var xR = wR;
});
var Wl = c((Wn) => {
  "use strict";
  Object.defineProperty(Wn, "__esModule", { value: !0 });
  function GR(e, t) {
    for (var r in t) Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
  }
  GR(Wn, {
    cleanupHTMLElement: function () {
      return xm;
    },
    clearAllStyles: function () {
      return wm;
    },
    clearObjectCache: function () {
      return nm;
    },
    getActionListProgress: function () {
      return Vm;
    },
    getAffectedElements: function () {
      return Un;
    },
    getComputedStyle: function () {
      return fm;
    },
    getDestinationValues: function () {
      return hm;
    },
    getElementId: function () {
      return am;
    },
    getInstanceId: function () {
      return om;
    },
    getInstanceOrigin: function () {
      return Em;
    },
    getItemConfigByKey: function () {
      return Im;
    },
    getMaxDurationItemIndex: function () {
      return Bl;
    },
    getNamespacedParameterId: function () {
      return Bm;
    },
    getRenderType: function () {
      return Vl;
    },
    getStyleProp: function () {
      return Tm;
    },
    mediaQueriesEqual: function () {
      return Hm;
    },
    observeStore: function () {
      return lm;
    },
    reduceListToGroup: function () {
      return Xm;
    },
    reifyState: function () {
      return sm;
    },
    renderHTMLElement: function () {
      return ym;
    },
    shallowEqual: function () {
      return Dl.default;
    },
    shouldAllowMediaQuery: function () {
      return Wm;
    },
    shouldNamespaceEventParameter: function () {
      return Um;
    },
    stringifyTarget: function () {
      return jm;
    },
  });
  var ne = Bt(il()),
    xn = Bt(hl()),
    wn = Bt(vl()),
    Cl = he(),
    le = G(),
    Dl = Bt(Sl()),
    VR = hn(),
    XR = mn(),
    k = Ln(),
    x = Dt();
  function Bt(e) {
    return e && e.__esModule ? e : { default: e };
  }
  var {
      BACKGROUND: UR,
      TRANSFORM: BR,
      TRANSLATE_3D: WR,
      SCALE_3D: HR,
      ROTATE_X: jR,
      ROTATE_Y: KR,
      ROTATE_Z: YR,
      SKEW: zR,
      PRESERVE_3D: kR,
      FLEX: QR,
      OPACITY: Xt,
      FILTER: $e,
      FONT_VARIATION_SETTINGS: Ze,
      WIDTH: Y,
      HEIGHT: z,
      BACKGROUND_COLOR: Ml,
      BORDER_COLOR: $R,
      COLOR: ZR,
      CHILDREN: Rl,
      IMMEDIATE_CHILDREN: JR,
      SIBLINGS: ml,
      PARENT: em,
      DISPLAY: Ut,
      WILL_CHANGE: me,
      AUTO: ie,
      COMMA_DELIMITER: Je,
      COLON_DELIMITER: tm,
      BAR_DELIMITER: qn,
      RENDER_TRANSFORM: Fl,
      RENDER_GENERAL: Gn,
      RENDER_STYLE: Vn,
      RENDER_PLUGIN: ql,
    } = le.IX2EngineConstants,
    {
      TRANSFORM_MOVE: Ne,
      TRANSFORM_SCALE: Pe,
      TRANSFORM_ROTATE: be,
      TRANSFORM_SKEW: et,
      STYLE_OPACITY: wl,
      STYLE_FILTER: tt,
      STYLE_FONT_VARIATION: rt,
      STYLE_SIZE: Le,
      STYLE_BACKGROUND_COLOR: De,
      STYLE_BORDER: Me,
      STYLE_TEXT_COLOR: Fe,
      GENERAL_DISPLAY: Wt,
      OBJECT_VALUE: rm,
    } = le.ActionTypeConsts,
    xl = (e) => e.trim(),
    Xn = Object.freeze({ [De]: Ml, [Me]: $R, [Fe]: ZR }),
    Gl = Object.freeze({
      [x.TRANSFORM_PREFIXED]: BR,
      [Ml]: UR,
      [Xt]: Xt,
      [$e]: $e,
      [Y]: Y,
      [z]: z,
      [Ze]: Ze,
    }),
    Vt = new Map();
  function nm() {
    Vt.clear();
  }
  var im = 1;
  function om() {
    return "i" + im++;
  }
  var um = 1;
  function am(e, t) {
    for (let r in e) {
      let n = e[r];
      if (n && n.ref === t) return n.id;
    }
    return "e" + um++;
  }
  function sm({ events: e, actionLists: t, site: r } = {}) {
    let n = (0, xn.default)(
        e,
        (u, a) => {
          let { eventTypeId: s } = a;
          return u[s] || (u[s] = {}), (u[s][a.id] = a), u;
        },
        {}
      ),
      i = r && r.mediaQueries,
      o = [];
    return (
      i
        ? (o = i.map((u) => u.key))
        : ((i = []), console.warn("IX2 missing mediaQueries in site data")),
      {
        ixData: {
          events: e,
          actionLists: t,
          eventTypeMap: n,
          mediaQueries: i,
          mediaQueryKeys: o,
        },
      }
    );
  }
  var cm = (e, t) => e === t;
  function lm({ store: e, select: t, onChange: r, comparator: n = cm }) {
    let { getState: i, subscribe: o } = e,
      u = o(s),
      a = t(i());
    function s() {
      let l = t(i());
      if (l == null) {
        u();
        return;
      }
      n(l, a) || ((a = l), r(a, e));
    }
    return u;
  }
  function Nl(e) {
    let t = typeof e;
    if (t === "string") return { id: e };
    if (e != null && t === "object") {
      let {
        id: r,
        objectId: n,
        selector: i,
        selectorGuids: o,
        appliesTo: u,
        useEventTarget: a,
      } = e;
      return {
        id: r,
        objectId: n,
        selector: i,
        selectorGuids: o,
        appliesTo: u,
        useEventTarget: a,
      };
    }
    return {};
  }
  function Un({
    config: e,
    event: t,
    eventTarget: r,
    elementRoot: n,
    elementApi: i,
  }) {
    if (!i) throw new Error("IX2 missing elementApi");
    let { targets: o } = e;
    if (Array.isArray(o) && o.length > 0)
      return o.reduce(
        (P, b) =>
          P.concat(
            Un({
              config: { target: b },
              event: t,
              eventTarget: r,
              elementRoot: n,
              elementApi: i,
            })
          ),
        []
      );
    let {
        getValidDocument: u,
        getQuerySelector: a,
        queryDocument: s,
        getChildElements: l,
        getSiblingElements: d,
        matchSelector: p,
        elementContains: f,
        isSiblingNode: E,
      } = i,
      { target: g } = e;
    if (!g) return [];
    let {
      id: _,
      objectId: h,
      selector: I,
      selectorGuids: y,
      appliesTo: A,
      useEventTarget: O,
    } = Nl(g);
    if (h) return [Vt.has(h) ? Vt.get(h) : Vt.set(h, {}).get(h)];
    if (A === le.EventAppliesTo.PAGE) {
      let P = u(_);
      return P ? [P] : [];
    }
    let T = (t?.action?.config?.affectedElements ?? {})[_ || I] || {},
      S = !!(T.id || T.selector),
      v,
      R,
      m,
      N = t && a(Nl(t.target));
    if (
      (S
        ? ((v = T.limitAffectedElements), (R = N), (m = a(T)))
        : (R = m = a({ id: _, selector: I, selectorGuids: y })),
      t && O)
    ) {
      let P = r && (m || O === !0) ? [r] : s(N);
      if (m) {
        if (O === em) return s(m).filter((b) => P.some((q) => f(b, q)));
        if (O === Rl) return s(m).filter((b) => P.some((q) => f(q, b)));
        if (O === ml) return s(m).filter((b) => P.some((q) => E(q, b)));
      }
      return P;
    }
    return R == null || m == null
      ? []
      : x.IS_BROWSER_ENV && n
      ? s(m).filter((P) => n.contains(P))
      : v === Rl
      ? s(R, m)
      : v === JR
      ? l(s(R)).filter(p(m))
      : v === ml
      ? d(s(R)).filter(p(m))
      : s(m);
  }
  function fm({ element: e, actionItem: t }) {
    if (!x.IS_BROWSER_ENV) return {};
    let { actionTypeId: r } = t;
    switch (r) {
      case Le:
      case De:
      case Me:
      case Fe:
      case Wt:
        return window.getComputedStyle(e);
      default:
        return {};
    }
  }
  var Pl = /px/,
    dm = (e, t) =>
      t.reduce(
        (r, n) => (r[n.type] == null && (r[n.type] = Om[n.type]), r),
        e || {}
      ),
    pm = (e, t) =>
      t.reduce(
        (r, n) => (
          r[n.type] == null && (r[n.type] = vm[n.type] || n.defaultValue || 0),
          r
        ),
        e || {}
      );
  function Em(e, t = {}, r = {}, n, i) {
    let { getStyle: o } = i,
      { actionTypeId: u } = n;
    if ((0, k.isPluginType)(u)) return (0, k.getPluginOrigin)(u)(t[u], n);
    switch (n.actionTypeId) {
      case Ne:
      case Pe:
      case be:
      case et:
        return t[n.actionTypeId] || Bn[n.actionTypeId];
      case tt:
        return dm(t[n.actionTypeId], n.config.filters);
      case rt:
        return pm(t[n.actionTypeId], n.config.fontVariations);
      case wl:
        return { value: (0, ne.default)(parseFloat(o(e, Xt)), 1) };
      case Le: {
        let a = o(e, Y),
          s = o(e, z),
          l,
          d;
        return (
          n.config.widthUnit === ie
            ? (l = Pl.test(a) ? parseFloat(a) : parseFloat(r.width))
            : (l = (0, ne.default)(parseFloat(a), parseFloat(r.width))),
          n.config.heightUnit === ie
            ? (d = Pl.test(s) ? parseFloat(s) : parseFloat(r.height))
            : (d = (0, ne.default)(parseFloat(s), parseFloat(r.height))),
          { widthValue: l, heightValue: d }
        );
      }
      case De:
      case Me:
      case Fe:
        return Mm({
          element: e,
          actionTypeId: n.actionTypeId,
          computedStyle: r,
          getStyle: o,
        });
      case Wt:
        return { value: (0, ne.default)(o(e, Ut), r.display) };
      case rm:
        return t[n.actionTypeId] || { value: 0 };
      default:
        return;
    }
  }
  var _m = (e, t) => (t && (e[t.type] = t.value || 0), e),
    gm = (e, t) => (t && (e[t.type] = t.value || 0), e),
    Im = (e, t, r) => {
      if ((0, k.isPluginType)(e)) return (0, k.getPluginConfig)(e)(r, t);
      switch (e) {
        case tt: {
          let n = (0, wn.default)(r.filters, ({ type: i }) => i === t);
          return n ? n.value : 0;
        }
        case rt: {
          let n = (0, wn.default)(r.fontVariations, ({ type: i }) => i === t);
          return n ? n.value : 0;
        }
        default:
          return r[t];
      }
    };
  function hm({ element: e, actionItem: t, elementApi: r }) {
    if ((0, k.isPluginType)(t.actionTypeId))
      return (0, k.getPluginDestination)(t.actionTypeId)(t.config);
    switch (t.actionTypeId) {
      case Ne:
      case Pe:
      case be:
      case et: {
        let { xValue: n, yValue: i, zValue: o } = t.config;
        return { xValue: n, yValue: i, zValue: o };
      }
      case Le: {
        let { getStyle: n, setStyle: i, getProperty: o } = r,
          { widthUnit: u, heightUnit: a } = t.config,
          { widthValue: s, heightValue: l } = t.config;
        if (!x.IS_BROWSER_ENV) return { widthValue: s, heightValue: l };
        if (u === ie) {
          let d = n(e, Y);
          i(e, Y, ""), (s = o(e, "offsetWidth")), i(e, Y, d);
        }
        if (a === ie) {
          let d = n(e, z);
          i(e, z, ""), (l = o(e, "offsetHeight")), i(e, z, d);
        }
        return { widthValue: s, heightValue: l };
      }
      case De:
      case Me:
      case Fe: {
        let {
          rValue: n,
          gValue: i,
          bValue: o,
          aValue: u,
          globalSwatchId: a,
        } = t.config;
        if (a && a.startsWith("--")) {
          let { getStyle: s } = r,
            l = s(e, a),
            d = (0, XR.normalizeColor)(l);
          return {
            rValue: d.red,
            gValue: d.green,
            bValue: d.blue,
            aValue: d.alpha,
          };
        }
        return { rValue: n, gValue: i, bValue: o, aValue: u };
      }
      case tt:
        return t.config.filters.reduce(_m, {});
      case rt:
        return t.config.fontVariations.reduce(gm, {});
      default: {
        let { value: n } = t.config;
        return { value: n };
      }
    }
  }
  function Vl(e) {
    if (/^TRANSFORM_/.test(e)) return Fl;
    if (/^STYLE_/.test(e)) return Vn;
    if (/^GENERAL_/.test(e)) return Gn;
    if (/^PLUGIN_/.test(e)) return ql;
  }
  function Tm(e, t) {
    return e === Vn ? t.replace("STYLE_", "").toLowerCase() : null;
  }
  function ym(e, t, r, n, i, o, u, a, s) {
    switch (a) {
      case Fl:
        return Cm(e, t, r, i, u);
      case Vn:
        return Fm(e, t, r, i, o, u);
      case Gn:
        return qm(e, i, u);
      case ql: {
        let { actionTypeId: l } = i;
        if ((0, k.isPluginType)(l)) return (0, k.renderPlugin)(l)(s, t, i);
      }
    }
  }
  var Bn = {
      [Ne]: Object.freeze({ xValue: 0, yValue: 0, zValue: 0 }),
      [Pe]: Object.freeze({ xValue: 1, yValue: 1, zValue: 1 }),
      [be]: Object.freeze({ xValue: 0, yValue: 0, zValue: 0 }),
      [et]: Object.freeze({ xValue: 0, yValue: 0 }),
    },
    Om = Object.freeze({
      blur: 0,
      "hue-rotate": 0,
      invert: 0,
      grayscale: 0,
      saturate: 100,
      sepia: 0,
      contrast: 100,
      brightness: 100,
    }),
    vm = Object.freeze({ wght: 0, opsz: 0, wdth: 0, slnt: 0 }),
    Am = (e, t) => {
      let r = (0, wn.default)(t.filters, ({ type: n }) => n === e);
      if (r && r.unit) return r.unit;
      switch (e) {
        case "blur":
          return "px";
        case "hue-rotate":
          return "deg";
        default:
          return "%";
      }
    },
    Sm = Object.keys(Bn);
  function Cm(e, t, r, n, i) {
    let o = Sm.map((a) => {
        let s = Bn[a],
          {
            xValue: l = s.xValue,
            yValue: d = s.yValue,
            zValue: p = s.zValue,
            xUnit: f = "",
            yUnit: E = "",
            zUnit: g = "",
          } = t[a] || {};
        switch (a) {
          case Ne:
            return `${WR}(${l}${f}, ${d}${E}, ${p}${g})`;
          case Pe:
            return `${HR}(${l}${f}, ${d}${E}, ${p}${g})`;
          case be:
            return `${jR}(${l}${f}) ${KR}(${d}${E}) ${YR}(${p}${g})`;
          case et:
            return `${zR}(${l}${f}, ${d}${E})`;
          default:
            return "";
        }
      }).join(" "),
      { setStyle: u } = i;
    fe(e, x.TRANSFORM_PREFIXED, i),
      u(e, x.TRANSFORM_PREFIXED, o),
      Nm(n, r) && u(e, x.TRANSFORM_STYLE_PREFIXED, kR);
  }
  function Rm(e, t, r, n) {
    let i = (0, xn.default)(t, (u, a, s) => `${u} ${s}(${a}${Am(s, r)})`, ""),
      { setStyle: o } = n;
    fe(e, $e, n), o(e, $e, i);
  }
  function mm(e, t, r, n) {
    let i = (0, xn.default)(
        t,
        (u, a, s) => (u.push(`"${s}" ${a}`), u),
        []
      ).join(", "),
      { setStyle: o } = n;
    fe(e, Ze, n), o(e, Ze, i);
  }
  function Nm({ actionTypeId: e }, { xValue: t, yValue: r, zValue: n }) {
    return (
      (e === Ne && n !== void 0) ||
      (e === Pe && n !== void 0) ||
      (e === be && (t !== void 0 || r !== void 0))
    );
  }
  var Pm = "\\(([^)]+)\\)",
    bm = /^rgb/,
    Lm = RegExp(`rgba?${Pm}`);
  function Dm(e, t) {
    let r = e.exec(t);
    return r ? r[1] : "";
  }
  function Mm({ element: e, actionTypeId: t, computedStyle: r, getStyle: n }) {
    let i = Xn[t],
      o = n(e, i),
      u = bm.test(o) ? o : r[i],
      a = Dm(Lm, u).split(Je);
    return {
      rValue: (0, ne.default)(parseInt(a[0], 10), 255),
      gValue: (0, ne.default)(parseInt(a[1], 10), 255),
      bValue: (0, ne.default)(parseInt(a[2], 10), 255),
      aValue: (0, ne.default)(parseFloat(a[3]), 1),
    };
  }
  function Fm(e, t, r, n, i, o) {
    let { setStyle: u } = o;
    switch (n.actionTypeId) {
      case Le: {
        let { widthUnit: a = "", heightUnit: s = "" } = n.config,
          { widthValue: l, heightValue: d } = r;
        l !== void 0 && (a === ie && (a = "px"), fe(e, Y, o), u(e, Y, l + a)),
          d !== void 0 && (s === ie && (s = "px"), fe(e, z, o), u(e, z, d + s));
        break;
      }
      case tt: {
        Rm(e, r, n.config, o);
        break;
      }
      case rt: {
        mm(e, r, n.config, o);
        break;
      }
      case De:
      case Me:
      case Fe: {
        let a = Xn[n.actionTypeId],
          s = Math.round(r.rValue),
          l = Math.round(r.gValue),
          d = Math.round(r.bValue),
          p = r.aValue;
        fe(e, a, o),
          u(e, a, p >= 1 ? `rgb(${s},${l},${d})` : `rgba(${s},${l},${d},${p})`);
        break;
      }
      default: {
        let { unit: a = "" } = n.config;
        fe(e, i, o), u(e, i, r.value + a);
        break;
      }
    }
  }
  function qm(e, t, r) {
    let { setStyle: n } = r;
    switch (t.actionTypeId) {
      case Wt: {
        let { value: i } = t.config;
        i === QR && x.IS_BROWSER_ENV ? n(e, Ut, x.FLEX_PREFIXED) : n(e, Ut, i);
        return;
      }
    }
  }
  function fe(e, t, r) {
    if (!x.IS_BROWSER_ENV) return;
    let n = Gl[t];
    if (!n) return;
    let { getStyle: i, setStyle: o } = r,
      u = i(e, me);
    if (!u) {
      o(e, me, n);
      return;
    }
    let a = u.split(Je).map(xl);
    a.indexOf(n) === -1 && o(e, me, a.concat(n).join(Je));
  }
  function Xl(e, t, r) {
    if (!x.IS_BROWSER_ENV) return;
    let n = Gl[t];
    if (!n) return;
    let { getStyle: i, setStyle: o } = r,
      u = i(e, me);
    !u ||
      u.indexOf(n) === -1 ||
      o(
        e,
        me,
        u
          .split(Je)
          .map(xl)
          .filter((a) => a !== n)
          .join(Je)
      );
  }
  function wm({ store: e, elementApi: t }) {
    let { ixData: r } = e.getState(),
      { events: n = {}, actionLists: i = {} } = r;
    Object.keys(n).forEach((o) => {
      let u = n[o],
        { config: a } = u.action,
        { actionListId: s } = a,
        l = i[s];
      l && bl({ actionList: l, event: u, elementApi: t });
    }),
      Object.keys(i).forEach((o) => {
        bl({ actionList: i[o], elementApi: t });
      });
  }
  function bl({ actionList: e = {}, event: t, elementApi: r }) {
    let { actionItemGroups: n, continuousParameterGroups: i } = e;
    n &&
      n.forEach((o) => {
        Ll({ actionGroup: o, event: t, elementApi: r });
      }),
      i &&
        i.forEach((o) => {
          let { continuousActionGroups: u } = o;
          u.forEach((a) => {
            Ll({ actionGroup: a, event: t, elementApi: r });
          });
        });
  }
  function Ll({ actionGroup: e, event: t, elementApi: r }) {
    let { actionItems: n } = e;
    n.forEach((i) => {
      let { actionTypeId: o, config: u } = i,
        a;
      (0, k.isPluginType)(o)
        ? (a = (s) => (0, k.clearPlugin)(o)(s, i))
        : (a = Ul({ effect: Gm, actionTypeId: o, elementApi: r })),
        Un({ config: u, event: t, elementApi: r }).forEach(a);
    });
  }
  function xm(e, t, r) {
    let { setStyle: n, getStyle: i } = r,
      { actionTypeId: o } = t;
    if (o === Le) {
      let { config: u } = t;
      u.widthUnit === ie && n(e, Y, ""), u.heightUnit === ie && n(e, z, "");
    }
    i(e, me) && Ul({ effect: Xl, actionTypeId: o, elementApi: r })(e);
  }
  var Ul =
    ({ effect: e, actionTypeId: t, elementApi: r }) =>
    (n) => {
      switch (t) {
        case Ne:
        case Pe:
        case be:
        case et:
          e(n, x.TRANSFORM_PREFIXED, r);
          break;
        case tt:
          e(n, $e, r);
          break;
        case rt:
          e(n, Ze, r);
          break;
        case wl:
          e(n, Xt, r);
          break;
        case Le:
          e(n, Y, r), e(n, z, r);
          break;
        case De:
        case Me:
        case Fe:
          e(n, Xn[t], r);
          break;
        case Wt:
          e(n, Ut, r);
          break;
      }
    };
  function Gm(e, t, r) {
    let { setStyle: n } = r;
    Xl(e, t, r),
      n(e, t, ""),
      t === x.TRANSFORM_PREFIXED && n(e, x.TRANSFORM_STYLE_PREFIXED, "");
  }
  function Bl(e) {
    let t = 0,
      r = 0;
    return (
      e.forEach((n, i) => {
        let { config: o } = n,
          u = o.delay + o.duration;
        u >= t && ((t = u), (r = i));
      }),
      r
    );
  }
  function Vm(e, t) {
    let { actionItemGroups: r, useFirstGroupAsInitialState: n } = e,
      { actionItem: i, verboseTimeElapsed: o = 0 } = t,
      u = 0,
      a = 0;
    return (
      r.forEach((s, l) => {
        if (n && l === 0) return;
        let { actionItems: d } = s,
          p = d[Bl(d)],
          { config: f, actionTypeId: E } = p;
        i.id === p.id && (a = u + o);
        let g = Vl(E) === Gn ? 0 : f.duration;
        u += f.delay + g;
      }),
      u > 0 ? (0, VR.optimizeFloat)(a / u) : 0
    );
  }
  function Xm({ actionList: e, actionItemId: t, rawData: r }) {
    let { actionItemGroups: n, continuousParameterGroups: i } = e,
      o = [],
      u = (a) => (
        o.push((0, Cl.mergeIn)(a, ["config"], { delay: 0, duration: 0 })),
        a.id === t
      );
    return (
      n && n.some(({ actionItems: a }) => a.some(u)),
      i &&
        i.some((a) => {
          let { continuousActionGroups: s } = a;
          return s.some(({ actionItems: l }) => l.some(u));
        }),
      (0, Cl.setIn)(r, ["actionLists"], {
        [e.id]: { id: e.id, actionItemGroups: [{ actionItems: o }] },
      })
    );
  }
  function Um(e, { basedOn: t }) {
    return (
      (e === le.EventTypeConsts.SCROLLING_IN_VIEW &&
        (t === le.EventBasedOn.ELEMENT || t == null)) ||
      (e === le.EventTypeConsts.MOUSE_MOVE && t === le.EventBasedOn.ELEMENT)
    );
  }
  function Bm(e, t) {
    return e + tm + t;
  }
  function Wm(e, t) {
    return t == null ? !0 : e.indexOf(t) !== -1;
  }
  function Hm(e, t) {
    return (0, Dl.default)(e && e.sort(), t && t.sort());
  }
  function jm(e) {
    if (typeof e == "string") return e;
    if (e.pluginElement && e.objectId) return e.pluginElement + qn + e.objectId;
    if (e.objectId) return e.objectId;
    let { id: t = "", selector: r = "", useEventTarget: n = "" } = e;
    return t + qn + r + qn + n;
  }
});
var de = c((Hn) => {
  "use strict";
  Object.defineProperty(Hn, "__esModule", { value: !0 });
  function Km(e, t) {
    for (var r in t) Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
  }
  Km(Hn, {
    IX2BrowserSupport: function () {
      return Ym;
    },
    IX2EasingUtils: function () {
      return km;
    },
    IX2Easings: function () {
      return zm;
    },
    IX2ElementsReducer: function () {
      return Qm;
    },
    IX2VanillaPlugins: function () {
      return $m;
    },
    IX2VanillaUtils: function () {
      return Zm;
    },
  });
  var Ym = qe(Dt()),
    zm = qe(_n()),
    km = qe(hn()),
    Qm = qe(Yc()),
    $m = qe(Ln()),
    Zm = qe(Wl());
  function Hl(e) {
    if (typeof WeakMap != "function") return null;
    var t = new WeakMap(),
      r = new WeakMap();
    return (Hl = function (n) {
      return n ? r : t;
    })(e);
  }
  function qe(e, t) {
    if (!t && e && e.__esModule) return e;
    if (e === null || (typeof e != "object" && typeof e != "function"))
      return { default: e };
    var r = Hl(t);
    if (r && r.has(e)) return r.get(e);
    var n = { __proto__: null },
      i = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for (var o in e)
      if (o !== "default" && Object.prototype.hasOwnProperty.call(e, o)) {
        var u = i ? Object.getOwnPropertyDescriptor(e, o) : null;
        u && (u.get || u.set) ? Object.defineProperty(n, o, u) : (n[o] = e[o]);
      }
    return (n.default = e), r && r.set(e, n), n;
  }
});
var zl = c((Kn) => {
  "use strict";
  Object.defineProperty(Kn, "__esModule", { value: !0 });
  Object.defineProperty(Kn, "ixInstances", {
    enumerable: !0,
    get: function () {
      return fN;
    },
  });
  var jl = G(),
    Kl = de(),
    we = he(),
    {
      IX2_RAW_DATA_IMPORTED: Jm,
      IX2_SESSION_STOPPED: eN,
      IX2_INSTANCE_ADDED: tN,
      IX2_INSTANCE_STARTED: rN,
      IX2_INSTANCE_REMOVED: nN,
      IX2_ANIMATION_FRAME_CHANGED: iN,
    } = jl.IX2EngineActionTypes,
    {
      optimizeFloat: Ht,
      applyEasing: Yl,
      createBezierEasing: oN,
    } = Kl.IX2EasingUtils,
    { RENDER_GENERAL: uN } = jl.IX2EngineConstants,
    {
      getItemConfigByKey: jn,
      getRenderType: aN,
      getStyleProp: sN,
    } = Kl.IX2VanillaUtils,
    cN = (e, t) => {
      let {
          position: r,
          parameterId: n,
          actionGroups: i,
          destinationKeys: o,
          smoothing: u,
          restingValue: a,
          actionTypeId: s,
          customEasingFn: l,
          skipMotion: d,
          skipToValue: p,
        } = e,
        { parameters: f } = t.payload,
        E = Math.max(1 - u, 0.01),
        g = f[n];
      g == null && ((E = 1), (g = a));
      let _ = Math.max(g, 0) || 0,
        h = Ht(_ - r),
        I = d ? p : Ht(r + h * E),
        y = I * 100;
      if (I === r && e.current) return e;
      let A, O, C, T;
      for (let v = 0, { length: R } = i; v < R; v++) {
        let { keyframe: m, actionItems: N } = i[v];
        if ((v === 0 && (A = N[0]), y >= m)) {
          A = N[0];
          let P = i[v + 1],
            b = P && y !== m;
          (O = b ? P.actionItems[0] : null),
            b && ((C = m / 100), (T = (P.keyframe - m) / 100));
        }
      }
      let S = {};
      if (A && !O)
        for (let v = 0, { length: R } = o; v < R; v++) {
          let m = o[v];
          S[m] = jn(s, m, A.config);
        }
      else if (A && O && C !== void 0 && T !== void 0) {
        let v = (I - C) / T,
          R = A.config.easing,
          m = Yl(R, v, l);
        for (let N = 0, { length: P } = o; N < P; N++) {
          let b = o[N],
            q = jn(s, b, A.config),
            cr = (jn(s, b, O.config) - q) * m + q;
          S[b] = cr;
        }
      }
      return (0, we.merge)(e, { position: I, current: S });
    },
    lN = (e, t) => {
      let {
          active: r,
          origin: n,
          start: i,
          immediate: o,
          renderType: u,
          verbose: a,
          actionItem: s,
          destination: l,
          destinationKeys: d,
          pluginDuration: p,
          instanceDelay: f,
          customEasingFn: E,
          skipMotion: g,
        } = e,
        _ = s.config.easing,
        { duration: h, delay: I } = s.config;
      p != null && (h = p),
        (I = f ?? I),
        u === uN ? (h = 0) : (o || g) && (h = I = 0);
      let { now: y } = t.payload;
      if (r && n) {
        let A = y - (i + I);
        if (a) {
          let v = y - i,
            R = h + I,
            m = Ht(Math.min(Math.max(0, v / R), 1));
          e = (0, we.set)(e, "verboseTimeElapsed", R * m);
        }
        if (A < 0) return e;
        let O = Ht(Math.min(Math.max(0, A / h), 1)),
          C = Yl(_, O, E),
          T = {},
          S = null;
        return (
          d.length &&
            (S = d.reduce((v, R) => {
              let m = l[R],
                N = parseFloat(n[R]) || 0,
                b = (parseFloat(m) - N) * C + N;
              return (v[R] = b), v;
            }, {})),
          (T.current = S),
          (T.position = O),
          O === 1 && ((T.active = !1), (T.complete = !0)),
          (0, we.merge)(e, T)
        );
      }
      return e;
    },
    fN = (e = Object.freeze({}), t) => {
      switch (t.type) {
        case Jm:
          return t.payload.ixInstances || Object.freeze({});
        case eN:
          return Object.freeze({});
        case tN: {
          let {
              instanceId: r,
              elementId: n,
              actionItem: i,
              eventId: o,
              eventTarget: u,
              eventStateKey: a,
              actionListId: s,
              groupIndex: l,
              isCarrier: d,
              origin: p,
              destination: f,
              immediate: E,
              verbose: g,
              continuous: _,
              parameterId: h,
              actionGroups: I,
              smoothing: y,
              restingValue: A,
              pluginInstance: O,
              pluginDuration: C,
              instanceDelay: T,
              skipMotion: S,
              skipToValue: v,
            } = t.payload,
            { actionTypeId: R } = i,
            m = aN(R),
            N = sN(m, R),
            P = Object.keys(f).filter(
              (q) => f[q] != null && typeof f[q] != "string"
            ),
            { easing: b } = i.config;
          return (0, we.set)(e, r, {
            id: r,
            elementId: n,
            active: !1,
            position: 0,
            start: 0,
            origin: p,
            destination: f,
            destinationKeys: P,
            immediate: E,
            verbose: g,
            current: null,
            actionItem: i,
            actionTypeId: R,
            eventId: o,
            eventTarget: u,
            eventStateKey: a,
            actionListId: s,
            groupIndex: l,
            renderType: m,
            isCarrier: d,
            styleProp: N,
            continuous: _,
            parameterId: h,
            actionGroups: I,
            smoothing: y,
            restingValue: A,
            pluginInstance: O,
            pluginDuration: C,
            instanceDelay: T,
            skipMotion: S,
            skipToValue: v,
            customEasingFn: Array.isArray(b) && b.length === 4 ? oN(b) : void 0,
          });
        }
        case rN: {
          let { instanceId: r, time: n } = t.payload;
          return (0, we.mergeIn)(e, [r], {
            active: !0,
            complete: !1,
            start: n,
          });
        }
        case nN: {
          let { instanceId: r } = t.payload;
          if (!e[r]) return e;
          let n = {},
            i = Object.keys(e),
            { length: o } = i;
          for (let u = 0; u < o; u++) {
            let a = i[u];
            a !== r && (n[a] = e[a]);
          }
          return n;
        }
        case iN: {
          let r = e,
            n = Object.keys(e),
            { length: i } = n;
          for (let o = 0; o < i; o++) {
            let u = n[o],
              a = e[u],
              s = a.continuous ? cN : lN;
            r = (0, we.set)(r, u, s(a, t));
          }
          return r;
        }
        default:
          return e;
      }
    };
});
var kl = c((Yn) => {
  "use strict";
  Object.defineProperty(Yn, "__esModule", { value: !0 });
  Object.defineProperty(Yn, "ixParameters", {
    enumerable: !0,
    get: function () {
      return gN;
    },
  });
  var dN = G(),
    {
      IX2_RAW_DATA_IMPORTED: pN,
      IX2_SESSION_STOPPED: EN,
      IX2_PARAMETER_CHANGED: _N,
    } = dN.IX2EngineActionTypes,
    gN = (e = {}, t) => {
      switch (t.type) {
        case pN:
          return t.payload.ixParameters || {};
        case EN:
          return {};
        case _N: {
          let { key: r, value: n } = t.payload;
          return (e[r] = n), e;
        }
        default:
          return e;
      }
    };
});
var Ql = c((zn) => {
  "use strict";
  Object.defineProperty(zn, "__esModule", { value: !0 });
  Object.defineProperty(zn, "default", {
    enumerable: !0,
    get: function () {
      return CN;
    },
  });
  var IN = Cr(),
    hN = co(),
    TN = Po(),
    yN = Lo(),
    ON = de(),
    vN = zl(),
    AN = kl(),
    { ixElements: SN } = ON.IX2ElementsReducer,
    CN = (0, IN.combineReducers)({
      ixData: hN.ixData,
      ixRequest: TN.ixRequest,
      ixSession: yN.ixSession,
      ixElements: SN,
      ixInstances: vN.ixInstances,
      ixParameters: AN.ixParameters,
    });
});
var Zl = c((E2, $l) => {
  var RN = ee(),
    mN = w(),
    NN = $(),
    PN = "[object String]";
  function bN(e) {
    return typeof e == "string" || (!mN(e) && NN(e) && RN(e) == PN);
  }
  $l.exports = bN;
});
var ef = c((_2, Jl) => {
  var LN = an(),
    DN = LN("length");
  Jl.exports = DN;
});
var rf = c((g2, tf) => {
  var MN = "\\ud800-\\udfff",
    FN = "\\u0300-\\u036f",
    qN = "\\ufe20-\\ufe2f",
    wN = "\\u20d0-\\u20ff",
    xN = FN + qN + wN,
    GN = "\\ufe0e\\ufe0f",
    VN = "\\u200d",
    XN = RegExp("[" + VN + MN + xN + GN + "]");
  function UN(e) {
    return XN.test(e);
  }
  tf.exports = UN;
});
var df = c((I2, ff) => {
  var of = "\\ud800-\\udfff",
    BN = "\\u0300-\\u036f",
    WN = "\\ufe20-\\ufe2f",
    HN = "\\u20d0-\\u20ff",
    jN = BN + WN + HN,
    KN = "\\ufe0e\\ufe0f",
    YN = "[" + of + "]",
    kn = "[" + jN + "]",
    Qn = "\\ud83c[\\udffb-\\udfff]",
    zN = "(?:" + kn + "|" + Qn + ")",
    uf = "[^" + of + "]",
    af = "(?:\\ud83c[\\udde6-\\uddff]){2}",
    sf = "[\\ud800-\\udbff][\\udc00-\\udfff]",
    kN = "\\u200d",
    cf = zN + "?",
    lf = "[" + KN + "]?",
    QN = "(?:" + kN + "(?:" + [uf, af, sf].join("|") + ")" + lf + cf + ")*",
    $N = lf + cf + QN,
    ZN = "(?:" + [uf + kn + "?", kn, af, sf, YN].join("|") + ")",
    nf = RegExp(Qn + "(?=" + Qn + ")|" + ZN + $N, "g");
  function JN(e) {
    for (var t = (nf.lastIndex = 0); nf.test(e); ) ++t;
    return t;
  }
  ff.exports = JN;
});
var Ef = c((h2, pf) => {
  var eP = ef(),
    tP = rf(),
    rP = df();
  function nP(e) {
    return tP(e) ? rP(e) : eP(e);
  }
  pf.exports = nP;
});
var gf = c((T2, _f) => {
  var iP = At(),
    oP = St(),
    uP = ae(),
    aP = Zl(),
    sP = Ef(),
    cP = "[object Map]",
    lP = "[object Set]";
  function fP(e) {
    if (e == null) return 0;
    if (uP(e)) return aP(e) ? sP(e) : e.length;
    var t = oP(e);
    return t == cP || t == lP ? e.size : iP(e).length;
  }
  _f.exports = fP;
});
var hf = c((y2, If) => {
  var dP = "Expected a function";
  function pP(e) {
    if (typeof e != "function") throw new TypeError(dP);
    return function () {
      var t = arguments;
      switch (t.length) {
        case 0:
          return !e.call(this);
        case 1:
          return !e.call(this, t[0]);
        case 2:
          return !e.call(this, t[0], t[1]);
        case 3:
          return !e.call(this, t[0], t[1], t[2]);
      }
      return !e.apply(this, t);
    };
  }
  If.exports = pP;
});
var $n = c((O2, Tf) => {
  var EP = te(),
    _P = (function () {
      try {
        var e = EP(Object, "defineProperty");
        return e({}, "", {}), e;
      } catch {}
    })();
  Tf.exports = _P;
});
var Zn = c((v2, Of) => {
  var yf = $n();
  function gP(e, t, r) {
    t == "__proto__" && yf
      ? yf(e, t, { configurable: !0, enumerable: !0, value: r, writable: !0 })
      : (e[t] = r);
  }
  Of.exports = gP;
});
var Af = c((A2, vf) => {
  var IP = Zn(),
    hP = pt(),
    TP = Object.prototype,
    yP = TP.hasOwnProperty;
  function OP(e, t, r) {
    var n = e[t];
    (!(yP.call(e, t) && hP(n, r)) || (r === void 0 && !(t in e))) &&
      IP(e, t, r);
  }
  vf.exports = OP;
});
var Rf = c((S2, Cf) => {
  var vP = Af(),
    AP = ke(),
    SP = Tt(),
    Sf = K(),
    CP = Re();
  function RP(e, t, r, n) {
    if (!Sf(e)) return e;
    t = AP(t, e);
    for (var i = -1, o = t.length, u = o - 1, a = e; a != null && ++i < o; ) {
      var s = CP(t[i]),
        l = r;
      if (s === "__proto__" || s === "constructor" || s === "prototype")
        return e;
      if (i != u) {
        var d = a[s];
        (l = n ? n(d, s, a) : void 0),
          l === void 0 && (l = Sf(d) ? d : SP(t[i + 1]) ? [] : {});
      }
      vP(a, s, l), (a = a[s]);
    }
    return e;
  }
  Cf.exports = RP;
});
var Nf = c((C2, mf) => {
  var mP = mt(),
    NP = Rf(),
    PP = ke();
  function bP(e, t, r) {
    for (var n = -1, i = t.length, o = {}; ++n < i; ) {
      var u = t[n],
        a = mP(e, u);
      r(a, u) && NP(o, PP(u, e), a);
    }
    return o;
  }
  mf.exports = bP;
});
var bf = c((R2, Pf) => {
  var LP = It(),
    DP = dr(),
    MP = jr(),
    FP = Hr(),
    qP = Object.getOwnPropertySymbols,
    wP = qP
      ? function (e) {
          for (var t = []; e; ) LP(t, MP(e)), (e = DP(e));
          return t;
        }
      : FP;
  Pf.exports = wP;
});
var Df = c((m2, Lf) => {
  function xP(e) {
    var t = [];
    if (e != null) for (var r in Object(e)) t.push(r);
    return t;
  }
  Lf.exports = xP;
});
var Ff = c((N2, Mf) => {
  var GP = K(),
    VP = vt(),
    XP = Df(),
    UP = Object.prototype,
    BP = UP.hasOwnProperty;
  function WP(e) {
    if (!GP(e)) return XP(e);
    var t = VP(e),
      r = [];
    for (var n in e) (n == "constructor" && (t || !BP.call(e, n))) || r.push(n);
    return r;
  }
  Mf.exports = WP;
});
var wf = c((P2, qf) => {
  var HP = Yr(),
    jP = Ff(),
    KP = ae();
  function YP(e) {
    return KP(e) ? HP(e, !0) : jP(e);
  }
  qf.exports = YP;
});
var Gf = c((b2, xf) => {
  var zP = Wr(),
    kP = bf(),
    QP = wf();
  function $P(e) {
    return zP(e, QP, kP);
  }
  xf.exports = $P;
});
var Xf = c((L2, Vf) => {
  var ZP = un(),
    JP = re(),
    eb = Nf(),
    tb = Gf();
  function rb(e, t) {
    if (e == null) return {};
    var r = ZP(tb(e), function (n) {
      return [n];
    });
    return (
      (t = JP(t)),
      eb(e, r, function (n, i) {
        return t(n, i[0]);
      })
    );
  }
  Vf.exports = rb;
});
var Bf = c((D2, Uf) => {
  var nb = re(),
    ib = hf(),
    ob = Xf();
  function ub(e, t) {
    return ob(e, ib(nb(t)));
  }
  Uf.exports = ub;
});
var Hf = c((M2, Wf) => {
  var ab = At(),
    sb = St(),
    cb = We(),
    lb = w(),
    fb = ae(),
    db = ht(),
    pb = vt(),
    Eb = Ot(),
    _b = "[object Map]",
    gb = "[object Set]",
    Ib = Object.prototype,
    hb = Ib.hasOwnProperty;
  function Tb(e) {
    if (e == null) return !0;
    if (
      fb(e) &&
      (lb(e) ||
        typeof e == "string" ||
        typeof e.splice == "function" ||
        db(e) ||
        Eb(e) ||
        cb(e))
    )
      return !e.length;
    var t = sb(e);
    if (t == _b || t == gb) return !e.size;
    if (pb(e)) return !ab(e).length;
    for (var r in e) if (hb.call(e, r)) return !1;
    return !0;
  }
  Wf.exports = Tb;
});
var Kf = c((F2, jf) => {
  var yb = Zn(),
    Ob = Dn(),
    vb = re();
  function Ab(e, t) {
    var r = {};
    return (
      (t = vb(t, 3)),
      Ob(e, function (n, i, o) {
        yb(r, i, t(n, i, o));
      }),
      r
    );
  }
  jf.exports = Ab;
});
var zf = c((q2, Yf) => {
  function Sb(e, t) {
    for (
      var r = -1, n = e == null ? 0 : e.length;
      ++r < n && t(e[r], r, e) !== !1;

    );
    return e;
  }
  Yf.exports = Sb;
});
var Qf = c((w2, kf) => {
  var Cb = Pt();
  function Rb(e) {
    return typeof e == "function" ? e : Cb;
  }
  kf.exports = Rb;
});
var Zf = c((x2, $f) => {
  var mb = zf(),
    Nb = Mn(),
    Pb = Qf(),
    bb = w();
  function Lb(e, t) {
    var r = bb(e) ? mb : Nb;
    return r(e, Pb(t));
  }
  $f.exports = Lb;
});
var ed = c((G2, Jf) => {
  var Db = W(),
    Mb = function () {
      return Db.Date.now();
    };
  Jf.exports = Mb;
});
var nd = c((V2, rd) => {
  var Fb = K(),
    Jn = ed(),
    td = bt(),
    qb = "Expected a function",
    wb = Math.max,
    xb = Math.min;
  function Gb(e, t, r) {
    var n,
      i,
      o,
      u,
      a,
      s,
      l = 0,
      d = !1,
      p = !1,
      f = !0;
    if (typeof e != "function") throw new TypeError(qb);
    (t = td(t) || 0),
      Fb(r) &&
        ((d = !!r.leading),
        (p = "maxWait" in r),
        (o = p ? wb(td(r.maxWait) || 0, t) : o),
        (f = "trailing" in r ? !!r.trailing : f));
    function E(T) {
      var S = n,
        v = i;
      return (n = i = void 0), (l = T), (u = e.apply(v, S)), u;
    }
    function g(T) {
      return (l = T), (a = setTimeout(I, t)), d ? E(T) : u;
    }
    function _(T) {
      var S = T - s,
        v = T - l,
        R = t - S;
      return p ? xb(R, o - v) : R;
    }
    function h(T) {
      var S = T - s,
        v = T - l;
      return s === void 0 || S >= t || S < 0 || (p && v >= o);
    }
    function I() {
      var T = Jn();
      if (h(T)) return y(T);
      a = setTimeout(I, _(T));
    }
    function y(T) {
      return (a = void 0), f && n ? E(T) : ((n = i = void 0), u);
    }
    function A() {
      a !== void 0 && clearTimeout(a), (l = 0), (n = s = i = a = void 0);
    }
    function O() {
      return a === void 0 ? u : y(Jn());
    }
    function C() {
      var T = Jn(),
        S = h(T);
      if (((n = arguments), (i = this), (s = T), S)) {
        if (a === void 0) return g(s);
        if (p) return clearTimeout(a), (a = setTimeout(I, t)), E(s);
      }
      return a === void 0 && (a = setTimeout(I, t)), u;
    }
    return (C.cancel = A), (C.flush = O), C;
  }
  rd.exports = Gb;
});
var od = c((X2, id) => {
  var Vb = nd(),
    Xb = K(),
    Ub = "Expected a function";
  function Bb(e, t, r) {
    var n = !0,
      i = !0;
    if (typeof e != "function") throw new TypeError(Ub);
    return (
      Xb(r) &&
        ((n = "leading" in r ? !!r.leading : n),
        (i = "trailing" in r ? !!r.trailing : i)),
      Vb(e, t, { leading: n, maxWait: t, trailing: i })
    );
  }
  id.exports = Bb;
});
var jt = c((ei) => {
  "use strict";
  Object.defineProperty(ei, "__esModule", { value: !0 });
  function Wb(e, t) {
    for (var r in t) Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
  }
  Wb(ei, {
    actionListPlaybackChanged: function () {
      return PL;
    },
    animationFrameChanged: function () {
      return AL;
    },
    clearRequested: function () {
      return TL;
    },
    elementStateChanged: function () {
      return NL;
    },
    eventListenerAdded: function () {
      return yL;
    },
    eventStateChanged: function () {
      return vL;
    },
    instanceAdded: function () {
      return CL;
    },
    instanceRemoved: function () {
      return mL;
    },
    instanceStarted: function () {
      return RL;
    },
    mediaQueriesDefined: function () {
      return LL;
    },
    parameterChanged: function () {
      return SL;
    },
    playbackRequested: function () {
      return IL;
    },
    previewRequested: function () {
      return gL;
    },
    rawDataImported: function () {
      return dL;
    },
    sessionInitialized: function () {
      return pL;
    },
    sessionStarted: function () {
      return EL;
    },
    sessionStopped: function () {
      return _L;
    },
    stopRequested: function () {
      return hL;
    },
    testFrameRendered: function () {
      return OL;
    },
    viewportWidthChanged: function () {
      return bL;
    },
  });
  var ud = G(),
    Hb = de(),
    {
      IX2_RAW_DATA_IMPORTED: jb,
      IX2_SESSION_INITIALIZED: Kb,
      IX2_SESSION_STARTED: Yb,
      IX2_SESSION_STOPPED: zb,
      IX2_PREVIEW_REQUESTED: kb,
      IX2_PLAYBACK_REQUESTED: Qb,
      IX2_STOP_REQUESTED: $b,
      IX2_CLEAR_REQUESTED: Zb,
      IX2_EVENT_LISTENER_ADDED: Jb,
      IX2_TEST_FRAME_RENDERED: eL,
      IX2_EVENT_STATE_CHANGED: tL,
      IX2_ANIMATION_FRAME_CHANGED: rL,
      IX2_PARAMETER_CHANGED: nL,
      IX2_INSTANCE_ADDED: iL,
      IX2_INSTANCE_STARTED: oL,
      IX2_INSTANCE_REMOVED: uL,
      IX2_ELEMENT_STATE_CHANGED: aL,
      IX2_ACTION_LIST_PLAYBACK_CHANGED: sL,
      IX2_VIEWPORT_WIDTH_CHANGED: cL,
      IX2_MEDIA_QUERIES_DEFINED: lL,
    } = ud.IX2EngineActionTypes,
    { reifyState: fL } = Hb.IX2VanillaUtils,
    dL = (e) => ({ type: jb, payload: { ...fL(e) } }),
    pL = ({ hasBoundaryNodes: e, reducedMotion: t }) => ({
      type: Kb,
      payload: { hasBoundaryNodes: e, reducedMotion: t },
    }),
    EL = () => ({ type: Yb }),
    _L = () => ({ type: zb }),
    gL = ({ rawData: e, defer: t }) => ({
      type: kb,
      payload: { defer: t, rawData: e },
    }),
    IL = ({
      actionTypeId: e = ud.ActionTypeConsts.GENERAL_START_ACTION,
      actionListId: t,
      actionItemId: r,
      eventId: n,
      allowEvents: i,
      immediate: o,
      testManual: u,
      verbose: a,
      rawData: s,
    }) => ({
      type: Qb,
      payload: {
        actionTypeId: e,
        actionListId: t,
        actionItemId: r,
        testManual: u,
        eventId: n,
        allowEvents: i,
        immediate: o,
        verbose: a,
        rawData: s,
      },
    }),
    hL = (e) => ({ type: $b, payload: { actionListId: e } }),
    TL = () => ({ type: Zb }),
    yL = (e, t) => ({ type: Jb, payload: { target: e, listenerParams: t } }),
    OL = (e = 1) => ({ type: eL, payload: { step: e } }),
    vL = (e, t) => ({ type: tL, payload: { stateKey: e, newState: t } }),
    AL = (e, t) => ({ type: rL, payload: { now: e, parameters: t } }),
    SL = (e, t) => ({ type: nL, payload: { key: e, value: t } }),
    CL = (e) => ({ type: iL, payload: { ...e } }),
    RL = (e, t) => ({ type: oL, payload: { instanceId: e, time: t } }),
    mL = (e) => ({ type: uL, payload: { instanceId: e } }),
    NL = (e, t, r, n) => ({
      type: aL,
      payload: { elementId: e, actionTypeId: t, current: r, actionItem: n },
    }),
    PL = ({ actionListId: e, isPlaying: t }) => ({
      type: sL,
      payload: { actionListId: e, isPlaying: t },
    }),
    bL = ({ width: e, mediaQueries: t }) => ({
      type: cL,
      payload: { width: e, mediaQueries: t },
    }),
    LL = () => ({ type: lL });
});
var cd = c((ri) => {
  "use strict";
  Object.defineProperty(ri, "__esModule", { value: !0 });
  function DL(e, t) {
    for (var r in t) Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
  }
  DL(ri, {
    elementContains: function () {
      return HL;
    },
    getChildElements: function () {
      return KL;
    },
    getClosestElement: function () {
      return zL;
    },
    getProperty: function () {
      return VL;
    },
    getQuerySelector: function () {
      return UL;
    },
    getRefType: function () {
      return kL;
    },
    getSiblingElements: function () {
      return YL;
    },
    getStyle: function () {
      return GL;
    },
    getValidDocument: function () {
      return BL;
    },
    isSiblingNode: function () {
      return jL;
    },
    matchSelector: function () {
      return XL;
    },
    queryDocument: function () {
      return WL;
    },
    setStyle: function () {
      return xL;
    },
  });
  var ML = de(),
    FL = G(),
    { ELEMENT_MATCHES: ti } = ML.IX2BrowserSupport,
    {
      IX2_ID_DELIMITER: ad,
      HTML_ELEMENT: qL,
      PLAIN_OBJECT: wL,
      WF_PAGE: sd,
    } = FL.IX2EngineConstants;
  function xL(e, t, r) {
    e.style[t] = r;
  }
  function GL(e, t) {
    if (t.startsWith("--"))
      return window
        .getComputedStyle(document.documentElement)
        .getPropertyValue(t);
    if (e.style instanceof CSSStyleDeclaration) return e.style[t];
  }
  function VL(e, t) {
    return e[t];
  }
  function XL(e) {
    return (t) => t[ti](e);
  }
  function UL({ id: e, selector: t }) {
    if (e) {
      let r = e;
      if (e.indexOf(ad) !== -1) {
        let n = e.split(ad),
          i = n[0];
        if (((r = n[1]), i !== document.documentElement.getAttribute(sd)))
          return null;
      }
      return `[data-w-id="${r}"], [data-w-id^="${r}_instance"]`;
    }
    return t;
  }
  function BL(e) {
    return e == null || e === document.documentElement.getAttribute(sd)
      ? document
      : null;
  }
  function WL(e, t) {
    return Array.prototype.slice.call(
      document.querySelectorAll(t ? e + " " + t : e)
    );
  }
  function HL(e, t) {
    return e.contains(t);
  }
  function jL(e, t) {
    return e !== t && e.parentNode === t.parentNode;
  }
  function KL(e) {
    let t = [];
    for (let r = 0, { length: n } = e || []; r < n; r++) {
      let { children: i } = e[r],
        { length: o } = i;
      if (o) for (let u = 0; u < o; u++) t.push(i[u]);
    }
    return t;
  }
  function YL(e = []) {
    let t = [],
      r = [];
    for (let n = 0, { length: i } = e; n < i; n++) {
      let { parentNode: o } = e[n];
      if (!o || !o.children || !o.children.length || r.indexOf(o) !== -1)
        continue;
      r.push(o);
      let u = o.firstElementChild;
      for (; u != null; )
        e.indexOf(u) === -1 && t.push(u), (u = u.nextElementSibling);
    }
    return t;
  }
  var zL = Element.prototype.closest
    ? (e, t) => (document.documentElement.contains(e) ? e.closest(t) : null)
    : (e, t) => {
        if (!document.documentElement.contains(e)) return null;
        let r = e;
        do {
          if (r[ti] && r[ti](t)) return r;
          r = r.parentNode;
        } while (r != null);
        return null;
      };
  function kL(e) {
    return e != null && typeof e == "object"
      ? e instanceof Element
        ? qL
        : wL
      : null;
  }
});
var ni = c((W2, fd) => {
  var QL = K(),
    ld = Object.create,
    $L = (function () {
      function e() {}
      return function (t) {
        if (!QL(t)) return {};
        if (ld) return ld(t);
        e.prototype = t;
        var r = new e();
        return (e.prototype = void 0), r;
      };
    })();
  fd.exports = $L;
});
var Kt = c((H2, dd) => {
  function ZL() {}
  dd.exports = ZL;
});
var zt = c((j2, pd) => {
  var JL = ni(),
    eD = Kt();
  function Yt(e, t) {
    (this.__wrapped__ = e),
      (this.__actions__ = []),
      (this.__chain__ = !!t),
      (this.__index__ = 0),
      (this.__values__ = void 0);
  }
  Yt.prototype = JL(eD.prototype);
  Yt.prototype.constructor = Yt;
  pd.exports = Yt;
});
var Id = c((K2, gd) => {
  var Ed = _e(),
    tD = We(),
    rD = w(),
    _d = Ed ? Ed.isConcatSpreadable : void 0;
  function nD(e) {
    return rD(e) || tD(e) || !!(_d && e && e[_d]);
  }
  gd.exports = nD;
});
var yd = c((Y2, Td) => {
  var iD = It(),
    oD = Id();
  function hd(e, t, r, n, i) {
    var o = -1,
      u = e.length;
    for (r || (r = oD), i || (i = []); ++o < u; ) {
      var a = e[o];
      t > 0 && r(a)
        ? t > 1
          ? hd(a, t - 1, r, n, i)
          : iD(i, a)
        : n || (i[i.length] = a);
    }
    return i;
  }
  Td.exports = hd;
});
var vd = c((z2, Od) => {
  var uD = yd();
  function aD(e) {
    var t = e == null ? 0 : e.length;
    return t ? uD(e, 1) : [];
  }
  Od.exports = aD;
});
var Sd = c((k2, Ad) => {
  function sD(e, t, r) {
    switch (r.length) {
      case 0:
        return e.call(t);
      case 1:
        return e.call(t, r[0]);
      case 2:
        return e.call(t, r[0], r[1]);
      case 3:
        return e.call(t, r[0], r[1], r[2]);
    }
    return e.apply(t, r);
  }
  Ad.exports = sD;
});
var md = c((Q2, Rd) => {
  var cD = Sd(),
    Cd = Math.max;
  function lD(e, t, r) {
    return (
      (t = Cd(t === void 0 ? e.length - 1 : t, 0)),
      function () {
        for (
          var n = arguments, i = -1, o = Cd(n.length - t, 0), u = Array(o);
          ++i < o;

        )
          u[i] = n[t + i];
        i = -1;
        for (var a = Array(t + 1); ++i < t; ) a[i] = n[i];
        return (a[t] = r(u)), cD(e, this, a);
      }
    );
  }
  Rd.exports = lD;
});
var Pd = c(($2, Nd) => {
  function fD(e) {
    return function () {
      return e;
    };
  }
  Nd.exports = fD;
});
var Dd = c((Z2, Ld) => {
  var dD = Pd(),
    bd = $n(),
    pD = Pt(),
    ED = bd
      ? function (e, t) {
          return bd(e, "toString", {
            configurable: !0,
            enumerable: !1,
            value: dD(t),
            writable: !0,
          });
        }
      : pD;
  Ld.exports = ED;
});
var Fd = c((J2, Md) => {
  var _D = 800,
    gD = 16,
    ID = Date.now;
  function hD(e) {
    var t = 0,
      r = 0;
    return function () {
      var n = ID(),
        i = gD - (n - r);
      if (((r = n), i > 0)) {
        if (++t >= _D) return arguments[0];
      } else t = 0;
      return e.apply(void 0, arguments);
    };
  }
  Md.exports = hD;
});
var wd = c((e1, qd) => {
  var TD = Dd(),
    yD = Fd(),
    OD = yD(TD);
  qd.exports = OD;
});
var Gd = c((t1, xd) => {
  var vD = vd(),
    AD = md(),
    SD = wd();
  function CD(e) {
    return SD(AD(e, void 0, vD), e + "");
  }
  xd.exports = CD;
});
var Ud = c((r1, Xd) => {
  var Vd = zr(),
    RD = Vd && new Vd();
  Xd.exports = RD;
});
var Wd = c((n1, Bd) => {
  function mD() {}
  Bd.exports = mD;
});
var ii = c((i1, jd) => {
  var Hd = Ud(),
    ND = Wd(),
    PD = Hd
      ? function (e) {
          return Hd.get(e);
        }
      : ND;
  jd.exports = PD;
});
var Yd = c((o1, Kd) => {
  var bD = {};
  Kd.exports = bD;
});
var oi = c((u1, kd) => {
  var zd = Yd(),
    LD = Object.prototype,
    DD = LD.hasOwnProperty;
  function MD(e) {
    for (
      var t = e.name + "", r = zd[t], n = DD.call(zd, t) ? r.length : 0;
      n--;

    ) {
      var i = r[n],
        o = i.func;
      if (o == null || o == e) return i.name;
    }
    return t;
  }
  kd.exports = MD;
});
var Qt = c((a1, Qd) => {
  var FD = ni(),
    qD = Kt(),
    wD = 4294967295;
  function kt(e) {
    (this.__wrapped__ = e),
      (this.__actions__ = []),
      (this.__dir__ = 1),
      (this.__filtered__ = !1),
      (this.__iteratees__ = []),
      (this.__takeCount__ = wD),
      (this.__views__ = []);
  }
  kt.prototype = FD(qD.prototype);
  kt.prototype.constructor = kt;
  Qd.exports = kt;
});
var Zd = c((s1, $d) => {
  function xD(e, t) {
    var r = -1,
      n = e.length;
    for (t || (t = Array(n)); ++r < n; ) t[r] = e[r];
    return t;
  }
  $d.exports = xD;
});
var ep = c((c1, Jd) => {
  var GD = Qt(),
    VD = zt(),
    XD = Zd();
  function UD(e) {
    if (e instanceof GD) return e.clone();
    var t = new VD(e.__wrapped__, e.__chain__);
    return (
      (t.__actions__ = XD(e.__actions__)),
      (t.__index__ = e.__index__),
      (t.__values__ = e.__values__),
      t
    );
  }
  Jd.exports = UD;
});
var np = c((l1, rp) => {
  var BD = Qt(),
    tp = zt(),
    WD = Kt(),
    HD = w(),
    jD = $(),
    KD = ep(),
    YD = Object.prototype,
    zD = YD.hasOwnProperty;
  function $t(e) {
    if (jD(e) && !HD(e) && !(e instanceof BD)) {
      if (e instanceof tp) return e;
      if (zD.call(e, "__wrapped__")) return KD(e);
    }
    return new tp(e);
  }
  $t.prototype = WD.prototype;
  $t.prototype.constructor = $t;
  rp.exports = $t;
});
var op = c((f1, ip) => {
  var kD = Qt(),
    QD = ii(),
    $D = oi(),
    ZD = np();
  function JD(e) {
    var t = $D(e),
      r = ZD[t];
    if (typeof r != "function" || !(t in kD.prototype)) return !1;
    if (e === r) return !0;
    var n = QD(r);
    return !!n && e === n[0];
  }
  ip.exports = JD;
});
var cp = c((d1, sp) => {
  var up = zt(),
    eM = Gd(),
    tM = ii(),
    ui = oi(),
    rM = w(),
    ap = op(),
    nM = "Expected a function",
    iM = 8,
    oM = 32,
    uM = 128,
    aM = 256;
  function sM(e) {
    return eM(function (t) {
      var r = t.length,
        n = r,
        i = up.prototype.thru;
      for (e && t.reverse(); n--; ) {
        var o = t[n];
        if (typeof o != "function") throw new TypeError(nM);
        if (i && !u && ui(o) == "wrapper") var u = new up([], !0);
      }
      for (n = u ? n : r; ++n < r; ) {
        o = t[n];
        var a = ui(o),
          s = a == "wrapper" ? tM(o) : void 0;
        s &&
        ap(s[0]) &&
        s[1] == (uM | iM | oM | aM) &&
        !s[4].length &&
        s[9] == 1
          ? (u = u[ui(s[0])].apply(u, s[3]))
          : (u = o.length == 1 && ap(o) ? u[a]() : u.thru(o));
      }
      return function () {
        var l = arguments,
          d = l[0];
        if (u && l.length == 1 && rM(d)) return u.plant(d).value();
        for (var p = 0, f = r ? t[p].apply(this, l) : d; ++p < r; )
          f = t[p].call(this, f);
        return f;
      };
    });
  }
  sp.exports = sM;
});
var fp = c((p1, lp) => {
  var cM = cp(),
    lM = cM();
  lp.exports = lM;
});
var pp = c((E1, dp) => {
  function fM(e, t, r) {
    return (
      e === e &&
        (r !== void 0 && (e = e <= r ? e : r),
        t !== void 0 && (e = e >= t ? e : t)),
      e
    );
  }
  dp.exports = fM;
});
var _p = c((_1, Ep) => {
  var dM = pp(),
    ai = bt();
  function pM(e, t, r) {
    return (
      r === void 0 && ((r = t), (t = void 0)),
      r !== void 0 && ((r = ai(r)), (r = r === r ? r : 0)),
      t !== void 0 && ((t = ai(t)), (t = t === t ? t : 0)),
      dM(ai(e), t, r)
    );
  }
  Ep.exports = pM;
});
var Mp = c((pi) => {
  "use strict";
  Object.defineProperty(pi, "__esModule", { value: !0 });
  Object.defineProperty(pi, "default", {
    enumerable: !0,
    get: function () {
      return kM;
    },
  });
  var EM = di(fp()),
    _M = di(Nt()),
    gM = di(_p()),
    pe = G(),
    si = Ei(),
    Zt = jt(),
    IM = de();
  function di(e) {
    return e && e.__esModule ? e : { default: e };
  }
  var {
      MOUSE_CLICK: hM,
      MOUSE_SECOND_CLICK: TM,
      MOUSE_DOWN: yM,
      MOUSE_UP: OM,
      MOUSE_OVER: vM,
      MOUSE_OUT: AM,
      DROPDOWN_CLOSE: SM,
      DROPDOWN_OPEN: CM,
      SLIDER_ACTIVE: RM,
      SLIDER_INACTIVE: mM,
      TAB_ACTIVE: NM,
      TAB_INACTIVE: PM,
      NAVBAR_CLOSE: bM,
      NAVBAR_OPEN: LM,
      MOUSE_MOVE: DM,
      PAGE_SCROLL_DOWN: Sp,
      SCROLL_INTO_VIEW: Cp,
      SCROLL_OUT_OF_VIEW: MM,
      PAGE_SCROLL_UP: FM,
      SCROLLING_IN_VIEW: qM,
      PAGE_FINISH: Rp,
      ECOMMERCE_CART_CLOSE: wM,
      ECOMMERCE_CART_OPEN: xM,
      PAGE_START: mp,
      PAGE_SCROLL: GM,
    } = pe.EventTypeConsts,
    ci = "COMPONENT_ACTIVE",
    Np = "COMPONENT_INACTIVE",
    { COLON_DELIMITER: gp } = pe.IX2EngineConstants,
    { getNamespacedParameterId: Ip } = IM.IX2VanillaUtils,
    Pp = (e) => (t) => typeof t == "object" && e(t) ? !0 : t,
    it = Pp(({ element: e, nativeEvent: t }) => e === t.target),
    VM = Pp(({ element: e, nativeEvent: t }) => e.contains(t.target)),
    Q = (0, EM.default)([it, VM]),
    bp = (e, t) => {
      if (t) {
        let { ixData: r } = e.getState(),
          { events: n } = r,
          i = n[t];
        if (i && !UM[i.eventTypeId]) return i;
      }
      return null;
    },
    XM = ({ store: e, event: t }) => {
      let { action: r } = t,
        { autoStopEventId: n } = r.config;
      return !!bp(e, n);
    },
    X = ({ store: e, event: t, element: r, eventStateKey: n }, i) => {
      let { action: o, id: u } = t,
        { actionListId: a, autoStopEventId: s } = o.config,
        l = bp(e, s);
      return (
        l &&
          (0, si.stopActionGroup)({
            store: e,
            eventId: s,
            eventTarget: r,
            eventStateKey: s + gp + n.split(gp)[1],
            actionListId: (0, _M.default)(l, "action.config.actionListId"),
          }),
        (0, si.stopActionGroup)({
          store: e,
          eventId: u,
          eventTarget: r,
          eventStateKey: n,
          actionListId: a,
        }),
        (0, si.startActionGroup)({
          store: e,
          eventId: u,
          eventTarget: r,
          eventStateKey: n,
          actionListId: a,
        }),
        i
      );
    },
    H = (e, t) => (r, n) => e(r, n) === !0 ? t(r, n) : n,
    ot = { handler: H(Q, X) },
    Lp = { ...ot, types: [ci, Np].join(" ") },
    li = [
      { target: window, types: "resize orientationchange", throttle: !0 },
      {
        target: document,
        types: "scroll wheel readystatechange IX2_PAGE_UPDATE",
        throttle: !0,
      },
    ],
    hp = "mouseover mouseout",
    fi = { types: li },
    UM = { PAGE_START: mp, PAGE_FINISH: Rp },
    nt = (() => {
      let e = window.pageXOffset !== void 0,
        r =
          document.compatMode === "CSS1Compat"
            ? document.documentElement
            : document.body;
      return () => ({
        scrollLeft: e ? window.pageXOffset : r.scrollLeft,
        scrollTop: e ? window.pageYOffset : r.scrollTop,
        stiffScrollTop: (0, gM.default)(
          e ? window.pageYOffset : r.scrollTop,
          0,
          r.scrollHeight - window.innerHeight
        ),
        scrollWidth: r.scrollWidth,
        scrollHeight: r.scrollHeight,
        clientWidth: r.clientWidth,
        clientHeight: r.clientHeight,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
      });
    })(),
    BM = (e, t) =>
      !(
        e.left > t.right ||
        e.right < t.left ||
        e.top > t.bottom ||
        e.bottom < t.top
      ),
    WM = ({ element: e, nativeEvent: t }) => {
      let { type: r, target: n, relatedTarget: i } = t,
        o = e.contains(n);
      if (r === "mouseover" && o) return !0;
      let u = e.contains(i);
      return !!(r === "mouseout" && o && u);
    },
    HM = (e) => {
      let {
          element: t,
          event: { config: r },
        } = e,
        { clientWidth: n, clientHeight: i } = nt(),
        o = r.scrollOffsetValue,
        s = r.scrollOffsetUnit === "PX" ? o : (i * (o || 0)) / 100;
      return BM(t.getBoundingClientRect(), {
        left: 0,
        top: s,
        right: n,
        bottom: i - s,
      });
    },
    Dp = (e) => (t, r) => {
      let { type: n } = t.nativeEvent,
        i = [ci, Np].indexOf(n) !== -1 ? n === ci : r.isActive,
        o = { ...r, isActive: i };
      return ((!r || o.isActive !== r.isActive) && e(t, o)) || o;
    },
    Tp = (e) => (t, r) => {
      let n = { elementHovered: WM(t) };
      return (
        ((r ? n.elementHovered !== r.elementHovered : n.elementHovered) &&
          e(t, n)) ||
        n
      );
    },
    jM = (e) => (t, r) => {
      let n = { ...r, elementVisible: HM(t) };
      return (
        ((r ? n.elementVisible !== r.elementVisible : n.elementVisible) &&
          e(t, n)) ||
        n
      );
    },
    yp =
      (e) =>
      (t, r = {}) => {
        let { stiffScrollTop: n, scrollHeight: i, innerHeight: o } = nt(),
          {
            event: { config: u, eventTypeId: a },
          } = t,
          { scrollOffsetValue: s, scrollOffsetUnit: l } = u,
          d = l === "PX",
          p = i - o,
          f = Number((n / p).toFixed(2));
        if (r && r.percentTop === f) return r;
        let E = (d ? s : (o * (s || 0)) / 100) / p,
          g,
          _,
          h = 0;
        r &&
          ((g = f > r.percentTop),
          (_ = r.scrollingDown !== g),
          (h = _ ? f : r.anchorTop));
        let I = a === Sp ? f >= h + E : f <= h - E,
          y = {
            ...r,
            percentTop: f,
            inBounds: I,
            anchorTop: h,
            scrollingDown: g,
          };
        return (r && I && (_ || y.inBounds !== r.inBounds) && e(t, y)) || y;
      },
    KM = (e, t) =>
      e.left > t.left && e.left < t.right && e.top > t.top && e.top < t.bottom,
    YM = (e) => (t, r) => {
      let n = { finished: document.readyState === "complete" };
      return n.finished && !(r && r.finshed) && e(t), n;
    },
    zM = (e) => (t, r) => {
      let n = { started: !0 };
      return r || e(t), n;
    },
    Op =
      (e) =>
      (t, r = { clickCount: 0 }) => {
        let n = { clickCount: (r.clickCount % 2) + 1 };
        return (n.clickCount !== r.clickCount && e(t, n)) || n;
      },
    Jt = (e = !0) => ({
      ...Lp,
      handler: H(
        e ? Q : it,
        Dp((t, r) => (r.isActive ? ot.handler(t, r) : r))
      ),
    }),
    er = (e = !0) => ({
      ...Lp,
      handler: H(
        e ? Q : it,
        Dp((t, r) => (r.isActive ? r : ot.handler(t, r)))
      ),
    }),
    vp = {
      ...fi,
      handler: jM((e, t) => {
        let { elementVisible: r } = t,
          { event: n, store: i } = e,
          { ixData: o } = i.getState(),
          { events: u } = o;
        return !u[n.action.config.autoStopEventId] && t.triggered
          ? t
          : (n.eventTypeId === Cp) === r
          ? (X(e), { ...t, triggered: !0 })
          : t;
      }),
    },
    Ap = 0.05,
    kM = {
      [RM]: Jt(),
      [mM]: er(),
      [CM]: Jt(),
      [SM]: er(),
      [LM]: Jt(!1),
      [bM]: er(!1),
      [NM]: Jt(),
      [PM]: er(),
      [xM]: { types: "ecommerce-cart-open", handler: H(Q, X) },
      [wM]: { types: "ecommerce-cart-close", handler: H(Q, X) },
      [hM]: {
        types: "click",
        handler: H(
          Q,
          Op((e, { clickCount: t }) => {
            XM(e) ? t === 1 && X(e) : X(e);
          })
        ),
      },
      [TM]: {
        types: "click",
        handler: H(
          Q,
          Op((e, { clickCount: t }) => {
            t === 2 && X(e);
          })
        ),
      },
      [yM]: { ...ot, types: "mousedown" },
      [OM]: { ...ot, types: "mouseup" },
      [vM]: {
        types: hp,
        handler: H(
          Q,
          Tp((e, t) => {
            t.elementHovered && X(e);
          })
        ),
      },
      [AM]: {
        types: hp,
        handler: H(
          Q,
          Tp((e, t) => {
            t.elementHovered || X(e);
          })
        ),
      },
      [DM]: {
        types: "mousemove mouseout scroll",
        handler: (
          {
            store: e,
            element: t,
            eventConfig: r,
            nativeEvent: n,
            eventStateKey: i,
          },
          o = { clientX: 0, clientY: 0, pageX: 0, pageY: 0 }
        ) => {
          let {
              basedOn: u,
              selectedAxis: a,
              continuousParameterGroupId: s,
              reverse: l,
              restingState: d = 0,
            } = r,
            {
              clientX: p = o.clientX,
              clientY: f = o.clientY,
              pageX: E = o.pageX,
              pageY: g = o.pageY,
            } = n,
            _ = a === "X_AXIS",
            h = n.type === "mouseout",
            I = d / 100,
            y = s,
            A = !1;
          switch (u) {
            case pe.EventBasedOn.VIEWPORT: {
              I = _
                ? Math.min(p, window.innerWidth) / window.innerWidth
                : Math.min(f, window.innerHeight) / window.innerHeight;
              break;
            }
            case pe.EventBasedOn.PAGE: {
              let {
                scrollLeft: O,
                scrollTop: C,
                scrollWidth: T,
                scrollHeight: S,
              } = nt();
              I = _ ? Math.min(O + E, T) / T : Math.min(C + g, S) / S;
              break;
            }
            case pe.EventBasedOn.ELEMENT:
            default: {
              y = Ip(i, s);
              let O = n.type.indexOf("mouse") === 0;
              if (O && Q({ element: t, nativeEvent: n }) !== !0) break;
              let C = t.getBoundingClientRect(),
                { left: T, top: S, width: v, height: R } = C;
              if (!O && !KM({ left: p, top: f }, C)) break;
              (A = !0), (I = _ ? (p - T) / v : (f - S) / R);
              break;
            }
          }
          return (
            h && (I > 1 - Ap || I < Ap) && (I = Math.round(I)),
            (u !== pe.EventBasedOn.ELEMENT || A || A !== o.elementHovered) &&
              ((I = l ? 1 - I : I), e.dispatch((0, Zt.parameterChanged)(y, I))),
            { elementHovered: A, clientX: p, clientY: f, pageX: E, pageY: g }
          );
        },
      },
      [GM]: {
        types: li,
        handler: ({ store: e, eventConfig: t }) => {
          let { continuousParameterGroupId: r, reverse: n } = t,
            { scrollTop: i, scrollHeight: o, clientHeight: u } = nt(),
            a = i / (o - u);
          (a = n ? 1 - a : a), e.dispatch((0, Zt.parameterChanged)(r, a));
        },
      },
      [qM]: {
        types: li,
        handler: (
          { element: e, store: t, eventConfig: r, eventStateKey: n },
          i = { scrollPercent: 0 }
        ) => {
          let {
              scrollLeft: o,
              scrollTop: u,
              scrollWidth: a,
              scrollHeight: s,
              clientHeight: l,
            } = nt(),
            {
              basedOn: d,
              selectedAxis: p,
              continuousParameterGroupId: f,
              startsEntering: E,
              startsExiting: g,
              addEndOffset: _,
              addStartOffset: h,
              addOffsetValue: I = 0,
              endOffsetValue: y = 0,
            } = r,
            A = p === "X_AXIS";
          if (d === pe.EventBasedOn.VIEWPORT) {
            let O = A ? o / a : u / s;
            return (
              O !== i.scrollPercent &&
                t.dispatch((0, Zt.parameterChanged)(f, O)),
              { scrollPercent: O }
            );
          } else {
            let O = Ip(n, f),
              C = e.getBoundingClientRect(),
              T = (h ? I : 0) / 100,
              S = (_ ? y : 0) / 100;
            (T = E ? T : 1 - T), (S = g ? S : 1 - S);
            let v = C.top + Math.min(C.height * T, l),
              m = C.top + C.height * S - v,
              N = Math.min(l + m, s),
              b = Math.min(Math.max(0, l - v), N) / N;
            return (
              b !== i.scrollPercent &&
                t.dispatch((0, Zt.parameterChanged)(O, b)),
              { scrollPercent: b }
            );
          }
        },
      },
      [Cp]: vp,
      [MM]: vp,
      [Sp]: {
        ...fi,
        handler: yp((e, t) => {
          t.scrollingDown && X(e);
        }),
      },
      [FM]: {
        ...fi,
        handler: yp((e, t) => {
          t.scrollingDown || X(e);
        }),
      },
      [Rp]: {
        types: "readystatechange IX2_PAGE_UPDATE",
        handler: H(it, YM(X)),
      },
      [mp]: {
        types: "readystatechange IX2_PAGE_UPDATE",
        handler: H(it, zM(X)),
      },
    };
});
var Ei = c((Ai) => {
  "use strict";
  Object.defineProperty(Ai, "__esModule", { value: !0 });
  function QM(e, t) {
    for (var r in t) Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
  }
  QM(Ai, {
    observeRequests: function () {
      return SF;
    },
    startActionGroup: function () {
      return yi;
    },
    startEngine: function () {
      return or;
    },
    stopActionGroup: function () {
      return Ti;
    },
    stopAllActionGroups: function () {
      return Wp;
    },
    stopEngine: function () {
      return ur;
    },
  });
  var $M = J(fn()),
    oe = J(Nt()),
    ZM = J(gf()),
    JM = J(Bf()),
    eF = J(Hf()),
    tF = J(Kf()),
    ut = J(Zf()),
    rF = J(od()),
    B = G(),
    wp = de(),
    M = jt(),
    F = iF(cd()),
    nF = J(Mp());
  function J(e) {
    return e && e.__esModule ? e : { default: e };
  }
  function xp(e) {
    if (typeof WeakMap != "function") return null;
    var t = new WeakMap(),
      r = new WeakMap();
    return (xp = function (n) {
      return n ? r : t;
    })(e);
  }
  function iF(e, t) {
    if (!t && e && e.__esModule) return e;
    if (e === null || (typeof e != "object" && typeof e != "function"))
      return { default: e };
    var r = xp(t);
    if (r && r.has(e)) return r.get(e);
    var n = { __proto__: null },
      i = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for (var o in e)
      if (o !== "default" && Object.prototype.hasOwnProperty.call(e, o)) {
        var u = i ? Object.getOwnPropertyDescriptor(e, o) : null;
        u && (u.get || u.set) ? Object.defineProperty(n, o, u) : (n[o] = e[o]);
      }
    return (n.default = e), r && r.set(e, n), n;
  }
  var oF = Object.keys(B.QuickEffectIds),
    _i = (e) => oF.includes(e),
    {
      COLON_DELIMITER: gi,
      BOUNDARY_SELECTOR: tr,
      HTML_ELEMENT: Gp,
      RENDER_GENERAL: uF,
      W_MOD_IX: Fp,
    } = B.IX2EngineConstants,
    {
      getAffectedElements: rr,
      getElementId: aF,
      getDestinationValues: Ii,
      observeStore: Ee,
      getInstanceId: sF,
      renderHTMLElement: cF,
      clearAllStyles: Vp,
      getMaxDurationItemIndex: lF,
      getComputedStyle: fF,
      getInstanceOrigin: dF,
      reduceListToGroup: pF,
      shouldNamespaceEventParameter: EF,
      getNamespacedParameterId: _F,
      shouldAllowMediaQuery: nr,
      cleanupHTMLElement: gF,
      clearObjectCache: IF,
      stringifyTarget: hF,
      mediaQueriesEqual: TF,
      shallowEqual: yF,
    } = wp.IX2VanillaUtils,
    {
      isPluginType: ir,
      createPluginInstance: hi,
      getPluginDuration: OF,
    } = wp.IX2VanillaPlugins,
    qp = navigator.userAgent,
    vF = qp.match(/iPad/i) || qp.match(/iPhone/),
    AF = 12;
  function SF(e) {
    Ee({ store: e, select: ({ ixRequest: t }) => t.preview, onChange: mF }),
      Ee({ store: e, select: ({ ixRequest: t }) => t.playback, onChange: NF }),
      Ee({ store: e, select: ({ ixRequest: t }) => t.stop, onChange: PF }),
      Ee({ store: e, select: ({ ixRequest: t }) => t.clear, onChange: bF });
  }
  function CF(e) {
    Ee({
      store: e,
      select: ({ ixSession: t }) => t.mediaQueryKey,
      onChange: () => {
        ur(e),
          Vp({ store: e, elementApi: F }),
          or({ store: e, allowEvents: !0 }),
          Xp();
      },
    });
  }
  function RF(e, t) {
    let r = Ee({
      store: e,
      select: ({ ixSession: n }) => n.tick,
      onChange: (n) => {
        t(n), r();
      },
    });
  }
  function mF({ rawData: e, defer: t }, r) {
    let n = () => {
      or({ store: r, rawData: e, allowEvents: !0 }), Xp();
    };
    t ? setTimeout(n, 0) : n();
  }
  function Xp() {
    document.dispatchEvent(new CustomEvent("IX2_PAGE_UPDATE"));
  }
  function NF(e, t) {
    let {
        actionTypeId: r,
        actionListId: n,
        actionItemId: i,
        eventId: o,
        allowEvents: u,
        immediate: a,
        testManual: s,
        verbose: l = !0,
      } = e,
      { rawData: d } = e;
    if (n && i && d && a) {
      let p = d.actionLists[n];
      p && (d = pF({ actionList: p, actionItemId: i, rawData: d }));
    }
    if (
      (or({ store: t, rawData: d, allowEvents: u, testManual: s }),
      (n && r === B.ActionTypeConsts.GENERAL_START_ACTION) || _i(r))
    ) {
      Ti({ store: t, actionListId: n }),
        Bp({ store: t, actionListId: n, eventId: o });
      let p = yi({
        store: t,
        eventId: o,
        actionListId: n,
        immediate: a,
        verbose: l,
      });
      l &&
        p &&
        t.dispatch(
          (0, M.actionListPlaybackChanged)({ actionListId: n, isPlaying: !a })
        );
    }
  }
  function PF({ actionListId: e }, t) {
    e ? Ti({ store: t, actionListId: e }) : Wp({ store: t }), ur(t);
  }
  function bF(e, t) {
    ur(t), Vp({ store: t, elementApi: F });
  }
  function or({ store: e, rawData: t, allowEvents: r, testManual: n }) {
    let { ixSession: i } = e.getState();
    t && e.dispatch((0, M.rawDataImported)(t)),
      i.active ||
        (e.dispatch(
          (0, M.sessionInitialized)({
            hasBoundaryNodes: !!document.querySelector(tr),
            reducedMotion:
              document.body.hasAttribute("data-wf-ix-vacation") &&
              window.matchMedia("(prefers-reduced-motion)").matches,
          })
        ),
        r &&
          (wF(e), LF(), e.getState().ixSession.hasDefinedMediaQueries && CF(e)),
        e.dispatch((0, M.sessionStarted)()),
        DF(e, n));
  }
  function LF() {
    let { documentElement: e } = document;
    e.className.indexOf(Fp) === -1 && (e.className += ` ${Fp}`);
  }
  function DF(e, t) {
    let r = (n) => {
      let { ixSession: i, ixParameters: o } = e.getState();
      i.active &&
        (e.dispatch((0, M.animationFrameChanged)(n, o)),
        t ? RF(e, r) : requestAnimationFrame(r));
    };
    r(window.performance.now());
  }
  function ur(e) {
    let { ixSession: t } = e.getState();
    if (t.active) {
      let { eventListeners: r } = t;
      r.forEach(MF), IF(), e.dispatch((0, M.sessionStopped)());
    }
  }
  function MF({ target: e, listenerParams: t }) {
    e.removeEventListener.apply(e, t);
  }
  function FF({
    store: e,
    eventStateKey: t,
    eventTarget: r,
    eventId: n,
    eventConfig: i,
    actionListId: o,
    parameterGroup: u,
    smoothing: a,
    restingValue: s,
  }) {
    let { ixData: l, ixSession: d } = e.getState(),
      { events: p } = l,
      f = p[n],
      { eventTypeId: E } = f,
      g = {},
      _ = {},
      h = [],
      { continuousActionGroups: I } = u,
      { id: y } = u;
    EF(E, i) && (y = _F(t, y));
    let A = d.hasBoundaryNodes && r ? F.getClosestElement(r, tr) : null;
    I.forEach((O) => {
      let { keyframe: C, actionItems: T } = O;
      T.forEach((S) => {
        let { actionTypeId: v } = S,
          { target: R } = S.config;
        if (!R) return;
        let m = R.boundaryMode ? A : null,
          N = hF(R) + gi + v;
        if (((_[N] = qF(_[N], C, S)), !g[N])) {
          g[N] = !0;
          let { config: P } = S;
          rr({
            config: P,
            event: f,
            eventTarget: r,
            elementRoot: m,
            elementApi: F,
          }).forEach((b) => {
            h.push({ element: b, key: N });
          });
        }
      });
    }),
      h.forEach(({ element: O, key: C }) => {
        let T = _[C],
          S = (0, oe.default)(T, "[0].actionItems[0]", {}),
          { actionTypeId: v } = S,
          m = (
            v === B.ActionTypeConsts.PLUGIN_RIVE
              ? (S.config?.target?.selectorGuids || []).length === 0
              : ir(v)
          )
            ? hi(v)?.(O, S)
            : null,
          N = Ii({ element: O, actionItem: S, elementApi: F }, m);
        Oi({
          store: e,
          element: O,
          eventId: n,
          actionListId: o,
          actionItem: S,
          destination: N,
          continuous: !0,
          parameterId: y,
          actionGroups: T,
          smoothing: a,
          restingValue: s,
          pluginInstance: m,
        });
      });
  }
  function qF(e = [], t, r) {
    let n = [...e],
      i;
    return (
      n.some((o, u) => (o.keyframe === t ? ((i = u), !0) : !1)),
      i == null && ((i = n.length), n.push({ keyframe: t, actionItems: [] })),
      n[i].actionItems.push(r),
      n
    );
  }
  function wF(e) {
    let { ixData: t } = e.getState(),
      { eventTypeMap: r } = t;
    Up(e),
      (0, ut.default)(r, (i, o) => {
        let u = nF.default[o];
        if (!u) {
          console.warn(`IX2 event type not configured: ${o}`);
          return;
        }
        BF({ logic: u, store: e, events: i });
      });
    let { ixSession: n } = e.getState();
    n.eventListeners.length && GF(e);
  }
  var xF = ["resize", "orientationchange"];
  function GF(e) {
    let t = () => {
      Up(e);
    };
    xF.forEach((r) => {
      window.addEventListener(r, t),
        e.dispatch((0, M.eventListenerAdded)(window, [r, t]));
    }),
      t();
  }
  function Up(e) {
    let { ixSession: t, ixData: r } = e.getState(),
      n = window.innerWidth;
    if (n !== t.viewportWidth) {
      let { mediaQueries: i } = r;
      e.dispatch((0, M.viewportWidthChanged)({ width: n, mediaQueries: i }));
    }
  }
  var VF = (e, t) => (0, JM.default)((0, tF.default)(e, t), eF.default),
    XF = (e, t) => {
      (0, ut.default)(e, (r, n) => {
        r.forEach((i, o) => {
          let u = n + gi + o;
          t(i, n, u);
        });
      });
    },
    UF = (e) => {
      let t = { target: e.target, targets: e.targets };
      return rr({ config: t, elementApi: F });
    };
  function BF({ logic: e, store: t, events: r }) {
    WF(r);
    let { types: n, handler: i } = e,
      { ixData: o } = t.getState(),
      { actionLists: u } = o,
      a = VF(r, UF);
    if (!(0, ZM.default)(a)) return;
    (0, ut.default)(a, (p, f) => {
      let E = r[f],
        { action: g, id: _, mediaQueries: h = o.mediaQueryKeys } = E,
        { actionListId: I } = g.config;
      TF(h, o.mediaQueryKeys) || t.dispatch((0, M.mediaQueriesDefined)()),
        g.actionTypeId === B.ActionTypeConsts.GENERAL_CONTINUOUS_ACTION &&
          (Array.isArray(E.config) ? E.config : [E.config]).forEach((A) => {
            let { continuousParameterGroupId: O } = A,
              C = (0, oe.default)(u, `${I}.continuousParameterGroups`, []),
              T = (0, $M.default)(C, ({ id: R }) => R === O),
              S = (A.smoothing || 0) / 100,
              v = (A.restingState || 0) / 100;
            T &&
              p.forEach((R, m) => {
                let N = _ + gi + m;
                FF({
                  store: t,
                  eventStateKey: N,
                  eventTarget: R,
                  eventId: _,
                  eventConfig: A,
                  actionListId: I,
                  parameterGroup: T,
                  smoothing: S,
                  restingValue: v,
                });
              });
          }),
        (g.actionTypeId === B.ActionTypeConsts.GENERAL_START_ACTION ||
          _i(g.actionTypeId)) &&
          Bp({ store: t, actionListId: I, eventId: _ });
    });
    let s = (p) => {
        let { ixSession: f } = t.getState();
        XF(a, (E, g, _) => {
          let h = r[g],
            I = f.eventState[_],
            { action: y, mediaQueries: A = o.mediaQueryKeys } = h;
          if (!nr(A, f.mediaQueryKey)) return;
          let O = (C = {}) => {
            let T = i(
              {
                store: t,
                element: E,
                event: h,
                eventConfig: C,
                nativeEvent: p,
                eventStateKey: _,
              },
              I
            );
            yF(T, I) || t.dispatch((0, M.eventStateChanged)(_, T));
          };
          y.actionTypeId === B.ActionTypeConsts.GENERAL_CONTINUOUS_ACTION
            ? (Array.isArray(h.config) ? h.config : [h.config]).forEach(O)
            : O();
        });
      },
      l = (0, rF.default)(s, AF),
      d = ({ target: p = document, types: f, throttle: E }) => {
        f.split(" ")
          .filter(Boolean)
          .forEach((g) => {
            let _ = E ? l : s;
            p.addEventListener(g, _),
              t.dispatch((0, M.eventListenerAdded)(p, [g, _]));
          });
      };
    Array.isArray(n) ? n.forEach(d) : typeof n == "string" && d(e);
  }
  function WF(e) {
    if (!vF) return;
    let t = {},
      r = "";
    for (let n in e) {
      let { eventTypeId: i, target: o } = e[n],
        u = F.getQuerySelector(o);
      t[u] ||
        ((i === B.EventTypeConsts.MOUSE_CLICK ||
          i === B.EventTypeConsts.MOUSE_SECOND_CLICK) &&
          ((t[u] = !0),
          (r += u + "{cursor: pointer;touch-action: manipulation;}")));
    }
    if (r) {
      let n = document.createElement("style");
      (n.textContent = r), document.body.appendChild(n);
    }
  }
  function Bp({ store: e, actionListId: t, eventId: r }) {
    let { ixData: n, ixSession: i } = e.getState(),
      { actionLists: o, events: u } = n,
      a = u[r],
      s = o[t];
    if (s && s.useFirstGroupAsInitialState) {
      let l = (0, oe.default)(s, "actionItemGroups[0].actionItems", []),
        d = (0, oe.default)(a, "mediaQueries", n.mediaQueryKeys);
      if (!nr(d, i.mediaQueryKey)) return;
      l.forEach((p) => {
        let { config: f, actionTypeId: E } = p,
          g =
            f?.target?.useEventTarget === !0 && f?.target?.objectId == null
              ? { target: a.target, targets: a.targets }
              : f,
          _ = rr({ config: g, event: a, elementApi: F }),
          h = ir(E);
        _.forEach((I) => {
          let y = h ? hi(E)?.(I, p) : null;
          Oi({
            destination: Ii({ element: I, actionItem: p, elementApi: F }, y),
            immediate: !0,
            store: e,
            element: I,
            eventId: r,
            actionItem: p,
            actionListId: t,
            pluginInstance: y,
          });
        });
      });
    }
  }
  function Wp({ store: e }) {
    let { ixInstances: t } = e.getState();
    (0, ut.default)(t, (r) => {
      if (!r.continuous) {
        let { actionListId: n, verbose: i } = r;
        vi(r, e),
          i &&
            e.dispatch(
              (0, M.actionListPlaybackChanged)({
                actionListId: n,
                isPlaying: !1,
              })
            );
      }
    });
  }
  function Ti({
    store: e,
    eventId: t,
    eventTarget: r,
    eventStateKey: n,
    actionListId: i,
  }) {
    let { ixInstances: o, ixSession: u } = e.getState(),
      a = u.hasBoundaryNodes && r ? F.getClosestElement(r, tr) : null;
    (0, ut.default)(o, (s) => {
      let l = (0, oe.default)(s, "actionItem.config.target.boundaryMode"),
        d = n ? s.eventStateKey === n : !0;
      if (s.actionListId === i && s.eventId === t && d) {
        if (a && l && !F.elementContains(a, s.element)) return;
        vi(s, e),
          s.verbose &&
            e.dispatch(
              (0, M.actionListPlaybackChanged)({
                actionListId: i,
                isPlaying: !1,
              })
            );
      }
    });
  }
  function yi({
    store: e,
    eventId: t,
    eventTarget: r,
    eventStateKey: n,
    actionListId: i,
    groupIndex: o = 0,
    immediate: u,
    verbose: a,
  }) {
    let { ixData: s, ixSession: l } = e.getState(),
      { events: d } = s,
      p = d[t] || {},
      { mediaQueries: f = s.mediaQueryKeys } = p,
      E = (0, oe.default)(s, `actionLists.${i}`, {}),
      { actionItemGroups: g, useFirstGroupAsInitialState: _ } = E;
    if (!g || !g.length) return !1;
    o >= g.length && (0, oe.default)(p, "config.loop") && (o = 0),
      o === 0 && _ && o++;
    let I =
        (o === 0 || (o === 1 && _)) && _i(p.action?.actionTypeId)
          ? p.config.delay
          : void 0,
      y = (0, oe.default)(g, [o, "actionItems"], []);
    if (!y.length || !nr(f, l.mediaQueryKey)) return !1;
    let A = l.hasBoundaryNodes && r ? F.getClosestElement(r, tr) : null,
      O = lF(y),
      C = !1;
    return (
      y.forEach((T, S) => {
        let { config: v, actionTypeId: R } = T,
          m = ir(R),
          { target: N } = v;
        if (!N) return;
        let P = N.boundaryMode ? A : null;
        rr({
          config: v,
          event: p,
          eventTarget: r,
          elementRoot: P,
          elementApi: F,
        }).forEach((q, Ri) => {
          let sr = m ? hi(R)?.(q, T) : null,
            cr = m ? OF(R)(q, T) : null;
          C = !0;
          let kp = O === S && Ri === 0,
            Qp = fF({ element: q, actionItem: T }),
            $p = Ii({ element: q, actionItem: T, elementApi: F }, sr);
          Oi({
            store: e,
            element: q,
            actionItem: T,
            eventId: t,
            eventTarget: r,
            eventStateKey: n,
            actionListId: i,
            groupIndex: o,
            isCarrier: kp,
            computedStyle: Qp,
            destination: $p,
            immediate: u,
            verbose: a,
            pluginInstance: sr,
            pluginDuration: cr,
            instanceDelay: I,
          });
        });
      }),
      C
    );
  }
  function Oi(e) {
    let { store: t, computedStyle: r, ...n } = e,
      {
        element: i,
        actionItem: o,
        immediate: u,
        pluginInstance: a,
        continuous: s,
        restingValue: l,
        eventId: d,
      } = n,
      p = !s,
      f = sF(),
      { ixElements: E, ixSession: g, ixData: _ } = t.getState(),
      h = aF(E, i),
      { refState: I } = E[h] || {},
      y = F.getRefType(i),
      A = g.reducedMotion && B.ReducedMotionTypes[o.actionTypeId],
      O;
    if (A && s)
      switch (_.events[d]?.eventTypeId) {
        case B.EventTypeConsts.MOUSE_MOVE:
        case B.EventTypeConsts.MOUSE_MOVE_IN_VIEWPORT:
          O = l;
          break;
        default:
          O = 0.5;
          break;
      }
    let C = dF(i, I, r, o, F, a);
    if (
      (t.dispatch(
        (0, M.instanceAdded)({
          instanceId: f,
          elementId: h,
          origin: C,
          refType: y,
          skipMotion: A,
          skipToValue: O,
          ...n,
        })
      ),
      Hp(document.body, "ix2-animation-started", f),
      u)
    ) {
      HF(t, f);
      return;
    }
    Ee({ store: t, select: ({ ixInstances: T }) => T[f], onChange: jp }),
      p && t.dispatch((0, M.instanceStarted)(f, g.tick));
  }
  function vi(e, t) {
    Hp(document.body, "ix2-animation-stopping", {
      instanceId: e.id,
      state: t.getState(),
    });
    let { elementId: r, actionItem: n } = e,
      { ixElements: i } = t.getState(),
      { ref: o, refType: u } = i[r] || {};
    u === Gp && gF(o, n, F), t.dispatch((0, M.instanceRemoved)(e.id));
  }
  function Hp(e, t, r) {
    let n = document.createEvent("CustomEvent");
    n.initCustomEvent(t, !0, !0, r), e.dispatchEvent(n);
  }
  function HF(e, t) {
    let { ixParameters: r } = e.getState();
    e.dispatch((0, M.instanceStarted)(t, 0)),
      e.dispatch((0, M.animationFrameChanged)(performance.now(), r));
    let { ixInstances: n } = e.getState();
    jp(n[t], e);
  }
  function jp(e, t) {
    let {
        active: r,
        continuous: n,
        complete: i,
        elementId: o,
        actionItem: u,
        actionTypeId: a,
        renderType: s,
        current: l,
        groupIndex: d,
        eventId: p,
        eventTarget: f,
        eventStateKey: E,
        actionListId: g,
        isCarrier: _,
        styleProp: h,
        verbose: I,
        pluginInstance: y,
      } = e,
      { ixData: A, ixSession: O } = t.getState(),
      { events: C } = A,
      T = C && C[p] ? C[p] : {},
      { mediaQueries: S = A.mediaQueryKeys } = T;
    if (nr(S, O.mediaQueryKey) && (n || r || i)) {
      if (l || (s === uF && i)) {
        t.dispatch((0, M.elementStateChanged)(o, a, l, u));
        let { ixElements: v } = t.getState(),
          { ref: R, refType: m, refState: N } = v[o] || {},
          P = N && N[a];
        (m === Gp || ir(a)) && cF(R, N, P, p, u, h, F, s, y);
      }
      if (i) {
        if (_) {
          let v = yi({
            store: t,
            eventId: p,
            eventTarget: f,
            eventStateKey: E,
            actionListId: g,
            groupIndex: d + 1,
            verbose: I,
          });
          I &&
            !v &&
            t.dispatch(
              (0, M.actionListPlaybackChanged)({
                actionListId: g,
                isPlaying: !1,
              })
            );
        }
        vi(e, t);
      }
    }
  }
});
var zp = c((Ci) => {
  "use strict";
  Object.defineProperty(Ci, "__esModule", { value: !0 });
  function jF(e, t) {
    for (var r in t) Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
  }
  jF(Ci, {
    actions: function () {
      return zF;
    },
    destroy: function () {
      return Yp;
    },
    init: function () {
      return ZF;
    },
    setEnv: function () {
      return $F;
    },
    store: function () {
      return ar;
    },
  });
  var KF = Cr(),
    YF = kF(Ql()),
    Si = Ei(),
    zF = QF(jt());
  function kF(e) {
    return e && e.__esModule ? e : { default: e };
  }
  function Kp(e) {
    if (typeof WeakMap != "function") return null;
    var t = new WeakMap(),
      r = new WeakMap();
    return (Kp = function (n) {
      return n ? r : t;
    })(e);
  }
  function QF(e, t) {
    if (!t && e && e.__esModule) return e;
    if (e === null || (typeof e != "object" && typeof e != "function"))
      return { default: e };
    var r = Kp(t);
    if (r && r.has(e)) return r.get(e);
    var n = { __proto__: null },
      i = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for (var o in e)
      if (o !== "default" && Object.prototype.hasOwnProperty.call(e, o)) {
        var u = i ? Object.getOwnPropertyDescriptor(e, o) : null;
        u && (u.get || u.set) ? Object.defineProperty(n, o, u) : (n[o] = e[o]);
      }
    return (n.default = e), r && r.set(e, n), n;
  }
  var ar = (0, KF.createStore)(YF.default);
  function $F(e) {
    e() && (0, Si.observeRequests)(ar);
  }
  function ZF(e) {
    Yp(), (0, Si.startEngine)({ store: ar, rawData: e, allowEvents: !0 });
  }
  function Yp() {
    (0, Si.stopEngine)(ar);
  }
});
function T1() {
  let e = zp();
  return e.setEnv(() => !0), e;
}
export { T1 as createIX2Engine };
/*! Bundled license information:

timm/lib/timm.js:
  (*!
   * Timm
   *
   * Immutability helpers with fast reads and acceptable writes.
   *
   * @copyright Guillermo Grau Panea 2016
   * @license MIT
   *)
*/
