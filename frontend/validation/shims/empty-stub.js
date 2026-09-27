// Empty stub for react-native internal subpath imports (harness only).
import React from 'react';

function translateStyle(style) {
  if (!style) return undefined;
  const out = {};
  const apply = (s) => {
    if (!s) return;
    for (const [k, v] of Object.entries(s)) {
      if (v == null) continue;
      const kebab = k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
      out[kebab] = typeof v === 'number' && !['opacity', 'zIndex', 'flex'].includes(k) ? `${v}px` : v;
    }
  };
  (Array.isArray(style) ? style : [style]).forEach(apply);
  return out;
}

//
// esbuild's CJS→ESM interop copies own enumerable properties (Object.assign
// semantics), so the specific symbols internals import must be REAL own
// properties — a get-trap alone is not enough. Everything else falls back to
// a deep proxy so arbitrary property writes never crash.
const explicit = {
  // react-native-gesture-handler handlers/customDirectEventTypes.js imports:
  ReactNativeViewConfigRegistry: {
    customDirectEventTypes: {},
    customBubblingEventTypes: {},
    register: (name, cfg) => ({ name, cfg }),
  },
  customDirectEventTypes: {},
  customBubblingEventTypes: {},
  codegenNativeComponent: () => {
    // Native view components (e.g. RNCSafeAreaProvider) get replaced by a
    // plain DOM renderer so safe-area providers actually render children.
    const NativeViewShim = ({ children, style, ...rest }) =>
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, ...translateStyle(style) } }, children);
    NativeViewShim.displayName = 'NativeViewShim';
    return NativeViewShim;
  },
  UIEventTypes: {},
  PressabilityDebugView: () => null,
  PressabilityDebug: { isEnabled: () => false, setPosition: () => {} },
};

function deep() {
  return new Proxy(function () {}, {
    get(target, prop) {
      if (prop === Symbol.toPrimitive) return () => '';
      if (prop === 'prototype') return target.prototype;
      if (prop === '__esModule') return false;
      if (!(prop in target)) target[prop] = deep();
      return target[prop];
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
    apply() { return deep(); },
    construct() { return {}; },
  });
}

/**
 * Any native component spec call — `codegenNativeComponent('RNCSafeAreaProvider')`
 * etc. — is invoked as `(module.exports)(name)` because esbuild's interop makes
 * `.default` the whole exports object. So the apply trap must return a real,
 * renderable component that renders its children (native providers like
 * SafeAreaProvider wrap the entire app; dropping children blanked the screen).
 */
const NativeComponentShim = React.forwardRef(function NativeComponentShim({ children, style, ...rest }, ref) {
  return React.createElement('div', {
    ref,
    style: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0, position: 'relative', ...translateStyle(style) },
  }, children);
});
NativeComponentShim.displayName = 'NativeComponentShim';

module.exports = new Proxy(deep(), {
  ownKeys(target) {
    return Array.from(new Set([...Reflect.ownKeys(target), ...Object.keys(explicit)]));
  },
  getOwnPropertyDescriptor(target, prop) {
    if (prop in explicit) {
      return { configurable: true, enumerable: true, get: () => explicit[prop], set: (v) => { explicit[prop] = v; } };
    }
    return Reflect.getOwnPropertyDescriptor(target, prop);
  },
  get(target, prop) {
    if (prop in explicit) return explicit[prop];
    return target[prop];
  },
  set(target, prop, value) {
    if (prop in explicit) { explicit[prop] = value; return true; }
    target[prop] = value;
    return true;
  },
  apply() {
    // Called as a function: treat as codegenNativeComponent(name, options).
    return NativeComponentShim;
  },
  construct() {
    return {};
  },
});
