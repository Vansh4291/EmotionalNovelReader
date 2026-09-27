/**
 * react-native web shim — validation harness ONLY (not shipped with the app).
 * Maps the exact subset of RN API the app uses to the DOM so the real screen
 * components can be exercised in a browser against the real backend.
 */
import React from 'react';

export const __DEV__ = true;

const DEV_FLAG = '__DEV__';
if (typeof globalThis !== 'undefined' && globalThis[DEV_FLAG] === undefined) {
  globalThis[DEV_FLAG] = true;
}

export const Platform = {
  OS: 'web',
  select: (options) => (options && (options.web ?? options.default)) ?? undefined,
};

const NUMERIC_PROPS = new Set([
  'flex', 'opacity', 'zIndex', 'fontSize', 'lineHeight', 'letterSpacing',
  'borderWidth', 'borderLeftWidth', 'borderRightWidth', 'borderTopWidth', 'borderBottomWidth',
  'borderRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius', 'borderTopLeftRadius', 'borderTopRightRadius',
]);

function toCss(style) {
  if (style == null) return null;
  const styles = Array.isArray(style) ? style : [style];
  const out = {};
  const push = (s) => {
    if (s == null) return;
    for (const [k, v] of Object.entries(s)) {
      if (v == null) continue;
      // Animated nodes / interpolated values / transform arrays can't be set
      // as CSS — skip (animations are out of scope for validation).
      if (typeof v === 'object' && !(v instanceof Date)) continue;
      if (k === 'transform' || k.startsWith('shadow') || k.startsWith('textShadow')) continue;
      switch (k) {
        case 'marginHorizontal': out.marginLeft = v; out.marginRight = v; break;
        case 'marginVertical': out.marginTop = v; out.marginBottom = v; break;
        case 'paddingHorizontal': out.paddingLeft = v; out.paddingRight = v; break;
        case 'paddingVertical': out.paddingTop = v; out.paddingBottom = v; break;
        case 'shadowColor': case 'shadowOffset': case 'shadowOpacity': case 'shadowRadius': break;
        case 'textShadowColor': case 'textShadowOffset': case 'textShadowRadius': break;
        case 'textAlignVertical': out.verticalAlign = v; break;
        case 'resizeMode': break;
        case 'flexDirection': out.flexDirection = v; break;
        case 'aspectRatio': out.aspectRatio = String(v); break;
        case 'fontWeight': out.fontWeight = String(v); break;
        default:
          if (NUMERIC_PROPS.has(k) && typeof v === 'number') out[cssProp(k)] = v;
          else out[cssProp(k)] = typeof v === 'number' ? `${v}px` : v;
      }
    }
  };
  const cssProp = (k) => k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
  styles.forEach(push);
  return out;
}

function resolveStyle(style, pressed) {
  if (typeof style === 'function') return toCss(style({ pressed }));
  return toCss(style);
}

function mergeRefs(...refs) {
  return (el) => refs.forEach((r) => {
    if (!r) return;
    if (typeof r === 'function') r(el);
    else if (r && typeof r === 'object') r.current = el;
  });
}

export const View = React.forwardRef(function View({ style, children, ...rest }, ref) {
  const { testID, accessibilityRole, ...domRest } = rest;
  // RN Views are flex containers (column) by default; without this the app's
  // flex:1 height chains collapse to zero in the browser.
  const defaults = { display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, position: 'relative' };
  return (
    <div ref={ref} style={{ ...defaults, ...resolveStyle(style, false) }} {...pickA11y(accessibilityRole, domRest)}>
      {children}
    </div>
  );
});

function pickA11y(role, rest) {
  const out = {};
  if (role) out.role = role;
  if (rest.accessibilityLabel != null) { out['aria-label'] = rest.accessibilityLabel; }
  if (rest.accessibilityHint != null) { out['aria-describedby'] = undefined; }
  if (rest.accessibilityState) {
    const st = rest.accessibilityState;
    if (st.disabled != null) out['aria-disabled'] = st.disabled;
    if (st.selected != null) out['aria-selected'] = st.selected;
    if (st.checked != null) out['aria-checked'] = st.checked;
  }
  if (rest.accessible === false) out['aria-hidden'] = true;
  if (rest.accessibilityElementsHidden) out['aria-hidden'] = true;
  if (rest.accessibilityViewIsModal) out['role'] = out.role || 'dialog';
  return out;
}

export const Text = React.forwardRef(function Text({ style, children, onPress, ...rest }, ref) {
  const { allowFontScaling, maxFontSizeMultiplier, numberOfLines, accessible, accessibilityRole, ...domRest } = rest;
  const css = {
    display: 'block',
    whiteSpace: 'pre-wrap',
    ...(numberOfLines ? { overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: numberOfLines, WebkitBoxOrient: 'vertical', whiteSpace: 'normal' } : {}),
    ...resolveStyle(style, false),
  };
  const extra = pickA11y(accessibilityRole, domRest);
  if (onPress) {
    return (
      <span ref={ref} style={{ ...css, cursor: 'pointer' }} role="button" tabIndex={0} onClick={onPress} {...extra}>
        {children}
      </span>
    );
  }
  return (
    <span ref={ref} style={css} {...extra}>
      {children}
    </span>
  );
});

export const Pressable = React.forwardRef(function Pressable(
  { style, children, onPress, onLongPress, disabled, ...rest }, ref
) {
  const [pressed, setPressed] = React.useState(false);
  const { accessibilityRole, accessibilityLabel, accessibilityHint, accessibilityState, ...other } = rest;
  const css = resolveStyle(style, pressed);
  return (
    <button
      type="button"
      ref={ref}
      disabled={disabled}
      style={{ background: 'none', border: 'none', font: 'inherit', color: 'inherit', textAlign: 'inherit', cursor: disabled ? 'default' : 'pointer', padding: 0, display: 'flex', flexDirection: 'column', minHeight: 0, ...css }}
      onClick={() => { if (!disabled && onPress) onPress(); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      role={accessibilityRole === 'text' ? 'text' : (accessibilityRole || 'button')}
      aria-label={accessibilityLabel}
      aria-disabled={disabled || (accessibilityState && accessibilityState.disabled)}
      aria-selected={accessibilityState && accessibilityState.selected}
      aria-hidden={rest.accessible === false || rest.accessibilityElementsHidden === true || undefined}
    >
      {typeof children === 'function' ? children({ pressed }) : children}
    </button>
  );
});

export const TouchableOpacity = React.forwardRef(function TouchableOpacity(
  { style, children, onPress, disabled, ...rest }, ref
) {
  const { accessibilityRole, accessibilityLabel, ...other } = rest;
  return (
    <button
      type="button"
      ref={ref}
      disabled={disabled}
      style={{ background: 'none', border: 'none', font: 'inherit', color: 'inherit', padding: 0, cursor: 'pointer', ...resolveStyle(style, false) }}
      onClick={() => { if (!disabled && onPress) onPress(); }}
      role={accessibilityRole || 'button'}
      aria-label={accessibilityLabel}
    >
      {children}
    </button>
  );
});

export const ScrollView = React.forwardRef(function ScrollView(
  { style, contentContainerStyle, children, refreshControl, showsVerticalScrollIndicator, ...rest }, ref
) {
  return (
    <div
      ref={ref}
      style={{ overflowY: 'auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', ...resolveStyle(style, false) }}
      data-has-refresh={refreshControl ? 'true' : undefined}
    >
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, ...resolveStyle(contentContainerStyle, false) }}>{children}</div>
    </div>
  );
});

export const TextInput = React.forwardRef(function TextInput(
  { style, value, onChangeText, placeholder, placeholderTextColor, ...rest }, ref
) {
  const { accessibilityLabel, ...other } = rest;
  return (
    <input
      ref={ref}
      type="text"
      value={value || ''}
      placeholder={placeholder}
      aria-label={accessibilityLabel}
      style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', ...resolveStyle(style, false), ...(placeholderTextColor ? { ['--ph']: placeholderTextColor } : {}) }}
      onChange={(e) => onChangeText && onChangeText(e.target.value)}
    />
  );
});

export const Switch = function Switch({ value, onValueChange, trackColor, thumbColor, accessibilityLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!value}
      aria-label={accessibilityLabel}
      onClick={() => onValueChange && onValueChange(!value)}
      style={{
        width: 46, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
        background: value ? (trackColor && trackColor.true) || '#4cd964' : (trackColor && trackColor.false) || '#d1d1d1',
        position: 'relative', transition: 'background 0.15s',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: value ? 21 : 3, width: 22, height: 22, borderRadius: 11,
        background: thumbColor || '#fff', transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  );
};

export const ActivityIndicator = function ActivityIndicator({ size = 'small', color = '#888' }) {
  const dim = size === 'large' ? 36 : 20;
  return (
    <div
      role="progressbar"
      style={{
        width: dim, height: dim, borderRadius: '50%',
        border: `2px solid ${color}22`, borderTopColor: color,
        animation: 'enr-spin 0.8s linear infinite',
      }}
    />
  );
};

export const StatusBar = function StatusBar() { return null; };

export const RefreshControl = function RefreshControl() { return null; };

export const Modal = function Modal({ visible, transparent, animationType, onRequestClose, children, accessibilityViewIsModal }) {
  if (!visible) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex' }}
      onKeyDown={(e) => { if (e.key === 'Escape' && onRequestClose) onRequestClose(); }}
    >
      {children}
    </div>
  );
};

let flatListSeq = 0;
export const FlatList = React.forwardRef(function FlatList(
  {
    data, renderItem, keyExtractor, ListEmptyComponent, ListHeaderComponent,
    ListHeaderComponentStyle, contentContainerStyle, style, ...rest
  }, ref
) {
  const items = data || [];
  const id = React.useMemo(() => `fl${flatListSeq++}`, []);
  React.useImperativeHandle(ref, () => ({
    scrollToIndex: ({ index }) => {
      const el = document.querySelector(`[data-flatlist="${id}"] [data-index="${index}"]`);
      if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    },
    scrollToOffset: () => {},
    getScrollResponder: () => ({}),
  }));
  return (
    <div ref={ref} data-flatlist={id} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', ...resolveStyle(style, false) }}>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, ...resolveStyle(contentContainerStyle, false) }}>
        {ListHeaderComponent ? (
          <div style={resolveStyle(ListHeaderComponentStyle, false)}>{typeof ListHeaderComponent === 'function' ? <ListHeaderComponent /> : ListHeaderComponent}</div>
        ) : null}
        {items.length === 0 && ListEmptyComponent ? (
          typeof ListEmptyComponent === 'function' ? <ListEmptyComponent /> : ListEmptyComponent
        ) : (
          items.map((item, index) => (
            <div key={keyExtractor ? keyExtractor(item, index) : index} data-index={index}>
              {renderItem({ item, index })}
            </div>
          ))
        )}
      </div>
    </div>
  );
});

export const Image = function Image({ source, style, ...rest }) {
  const uri = source && (source.uri || (Array.isArray(source) && source[0] && source[0].uri));
  return uri ? <img src={uri} style={resolveStyle(style, false)} {...rest} alt="" /> : <div style={resolveStyle(style, false)} {...rest} />;
};

export const SafeAreaView = View;
export const KeyboardAvoidingView = View;

export const Alert = {
  alert(title, message, buttons) {
    window.__ALERTS__ = window.__ALERTS__ || [];
    window.__ALERTS__.push({ title, message, buttons: (buttons || []).map((b) => b.text) });
    const region = document.getElementById('alert-region');
    if (!region) return;
    region.innerHTML = '';
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:50%;top:24%;transform:translateX(-50%);z-index:2000;background:#222;color:#eee;padding:16px 20px;border-radius:12px;min-width:260px;box-shadow:0 8px 30px rgba(0,0,0,0.5);font-family:sans-serif;font-size:14px;';
    const h = document.createElement('div');
    h.style.fontWeight = '700';
    h.style.marginBottom = '6px';
    h.textContent = title;
    box.appendChild(h);
    if (message) {
      const p = document.createElement('div');
      p.style.opacity = '0.85';
      p.style.marginBottom = '12px';
      p.textContent = message;
      box.appendChild(p);
    }
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';
    (buttons || [{ text: 'OK' }]).forEach((b) => {
      const btn = document.createElement('button');
      btn.textContent = b.text || 'OK';
      btn.setAttribute('data-alert-button', b.text);
      btn.style.cssText = `padding:8px 14px;border-radius:8px;border:none;cursor:pointer;font-weight:600;background:${b.style === 'destructive' ? '#B33A3A' : '#C9A86C'};color:#fff;`;
      btn.onclick = () => { region.innerHTML = ''; if (b.onPress) b.onPress(); };
      row.appendChild(btn);
    });
    box.appendChild(row);
    region.appendChild(box);
  },
};

export const StyleSheet = {
  create: (s) => s,
  hairlineWidth: 1,
  flatten: (s) => s,
  absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
};

export const LogBox = { ignoreLogs: () => {}, ignoreAllLogs: () => {} };

export const GestureHandlerRootView = View;

export const I18nManager = {
  isRTL: false,
  doLeftAndRightSwapInRTL: true,
  allowRTL: () => {},
  forceRTL: () => {},
  swapLeftAndRightInRTL: () => {},
  getConstants: () => ({ isRTL: false, doLeftAndRightSwapInRTL: true }),
};

export const Dimensions = { get: () => ({ width: window.innerWidth, height: window.innerHeight }) };

export const AppRegistry = {
  registerComponent: () => {},
  getApplication: () => null,
};

export const NativeModules = {};
export const NativeEventEmitter = class { addListener() { return { remove() {} }; } removeListeners() {} };

// ---- Named exports pulled in by @react-navigation internals ----
export const DeviceEventEmitter = {
  addListener: () => ({ remove() {} }),
  removeListener: () => {},
  removeAllListeners: () => {},
  emit: () => {},
};

export const TurboModuleRegistry = {
  get: () => ({}),
  getEnforcing: () => ({}),
};

export const findNodeHandle = () => null;

export const UIManager = {
  getViewManagerConfig: () => ({}),
  measure: () => {},
  measureInWindow: () => {},
  measureLayout: () => {},
  dispatchViewManagerCommand: () => {},
  setJSResponder: () => {},
  clearJSResponder: () => {},
};

// react-native-gesture-handler registers custom event types on these
// registries at import time; provide mutable objects.
export const ReactNativeViewConfigRegistry = {
  customDirectEventTypes: {},
  customBubblingEventTypes: {},
  register: (name, cfg) => ({ name, cfg }),
};
export const customDirectEventTypes = {};
export const customBubblingEventTypes = {};

export const AppState = {
  currentState: 'active',
  addEventListener: () => ({ remove() {} }),
};

export const BackHandler = {
  addEventListener: () => ({ remove() {} }),
  exitApp: () => {},
};

export const Linking = {
  addEventListener: () => ({ remove() {} }),
  openURL: () => Promise.resolve(),
  canOpenURL: () => Promise.resolve(false),
  getInitialURL: () => Promise.resolve(null),
};

export const InteractionManager = {
  runAfterInteractions: (cb) => { cb && cb(); return { cancel() {} }; },
  createInteractionHandle: () => 1,
  clearInteractionHandle: () => {},
  addListener: () => ({ remove() {} }),
};

export const Appearance = {
  getColorScheme: () => 'dark',
  addChangeListener: () => ({ remove() {} }),
};

export const useColorScheme = () => 'dark';
export const useWindowDimensions = () => ({ width: window.innerWidth, height: window.innerHeight, fontScale: 1 });
export const PixelRatio = { get: () => 2, getFontScale: () => 1, roundToNearestPixel: (n) => n };
export const Vibration = { vibrate: () => {}, cancel: () => {} };
export const Share = { share: () => Promise.resolve({ dismissedAction: true }) };
export const ToastAndroid = { show: () => {}, SHORT: 1, LONG: 1 };
export const processColor = (c) => c;
export const codegenNativeComponent = () => ({});
export const requireNativeComponent = () => ({});
export const HostComponent = {};
export const EmitterSubscription = class {};
export const EventSubscription = class {};
export const RCTDeviceEventEmitter = DeviceEventEmitter;
export const Keyboard = { addListener: () => ({ remove() {} }), dismiss: () => {} };
export const LayoutAnimation = { configureNext: () => {}, create: () => ({}) };
export const TouchableHighlight = View;
export const TouchableWithoutFeedback = View;
export const TouchableNativeFeedback = { SelectableBackground: () => ({}), SelectableBackgroundBorderless: () => ({}), Ripple: () => ({}), canUseNativeForeground: () => false };
export const DrawerLayoutAndroid = View;
export const SectionList = FlatList;
export const VirtualizedList = FlatList;
export const animate = () => {};
export const Easing = { linear: (t) => t, ease: (t) => t };
export const Animated = {
  View, Text, ScrollView,
  Value: class AnimatedValue {
    constructor(v) { this._value = v; }
    setValue(v) { this._value = v; }
    getValue() { return this._value; }
    // Tab bars / headers call interpolate() during render; returning a plain
    // number keeps every style consumer valid (animations are static here).
    interpolate() { return this._value; }
    addListener() { return { remove() {} }; }
    removeListener() {}
    removeAllListeners() {}
    stopAnimation() {}
    stopTracking() {}
    flattenOffset() {}
    extractOffset() {}
  },
  timing: () => ({ start: (cb) => cb && cb({ finished: true }) }),
  spring: () => ({ start: (cb) => cb && cb({ finished: true }) }),
  event: () => () => {},
  createAnimatedComponent: (C) => C,
  decay: () => ({ start: () => {} }),
  parallel: () => ({ start: (cb) => cb && cb({ finished: true }) }),
  sequence: () => ({ start: (cb) => cb && cb({ finished: true }) }),
  delay: () => ({ start: () => {} }),
};
