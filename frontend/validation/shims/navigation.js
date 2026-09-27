/**
 * Minimal-but-real navigation shim (validation harness ONLY).
 *
 * Implements the subset of @react-navigation the app uses with genuine
 * stateful behavior: a stack navigator wrapping a bottom-tab navigator,
 * params, goBack/navigate/push, focus effects, and header/tab-bar rendering.
 *
 * Tab targets switch tabs; non-tab targets (BookDetail, Player, Settings as a
 * stack push) delegate upward via ParentNavContext.
 */
import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

const ParentNavContext = createContext(null);
let routeSeq = 1;

export const NavigationContainer = ({ children }) => <>{children}</>;

export const useFocusEffect = (cb) => {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => { ref.current(); }, []);
};

function ScreenFn() { return null; }

export function createNativeStackNavigator() { return makeNavigator(); }
export function createStackNavigator() { return makeNavigator(); }
export function createBottomTabNavigator() { return makeNavigator(true); }

function makeNavigator(isTab = false) {
  const Nav = {
    Screen: ScreenFn,
    Navigator: function Navigator({ children, initialRouteName, screenOptions }) {
      const screens = React.Children.toArray(children)
        .filter((c) => c && c.type === ScreenFn)
        .map((c) => ({ name: c.props.name, component: c.props.component, options: c.props.options }));

      const [stack, setStack] = useState([{ key: `r${routeSeq++}`, name: initialRouteName || screens[0].name, params: {} }]);
      const [tabIndex, setTabIndex] = useState(() => {
        const i = screens.findIndex((s) => s.name === stack[0].name);
        return i >= 0 ? i : 0;
      });

      const parentNav = useContext(ParentNavContext);

      const nav = useMemo(() => ({
        navigate: (name, params) => {
          const idx = screens.findIndex((s) => s.name === name);
          if (idx >= 0 && isTab) {
            setTabIndex(idx);
            setStack([{ key: `r${routeSeq++}`, name, params: params || {} }]);
            return;
          }
          if (parentNav && parentNav.__navigateToStack) { parentNav.__navigateToStack(name, params); return; }
          // Fallback: treat as push within this navigator.
          setStack((s) => [...s, { key: `r${routeSeq++}`, name, params: params || {} }]);
        },
        push: (name, params) => {
          if (parentNav && parentNav.__navigateToStack) { parentNav.__navigateToStack(name, params); return; }
          setStack((s) => [...s, { key: `r${routeSeq++}`, name, params: params || {} }]);
        },
        goBack: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
        canGoBack: () => stack.length > 1,
        addListener: () => ({ remove() {} }),
        setOptions: () => {},
        __navigateToStack: (name, params) => setStack((s) => [...s, { key: `r${routeSeq++}`, name, params: params || {} }]),
      }), [screens, isTab, parentNav, stack.length]);

      const current = stack[stack.length - 1];
      const currentIdx = screens.findIndex((s) => s.name === current.name);
      const screen = screens[currentIdx >= 0 ? currentIdx : 0];
      if (!screen) return <div data-nav-error={`unknown route: ${current.name}`} />;

      const route = { params: current.params || {}, key: current.key, name: current.name };
      const opts = typeof screen.options === 'function' ? screen.options({ route }) : (screen.options || {});
      const gOpts = typeof screenOptions === 'function' ? screenOptions({ route }) : (screenOptions || {});
      const headerTitle = opts.title != null ? opts.title : (gOpts && gOpts.title) || screen.name;
      const Body = screen.component;

      return (
        <ParentNavContext.Provider value={nav}>
          <div data-screen={current.name} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, flex: 1 }}>
            {opts.headerShown !== false && (
              <div data-testid="nav-header" style={{ padding: '10px 16px', fontWeight: 600, fontSize: 17 }}>
                {headerTitle}
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Body navigation={nav} route={route} />
            </div>
            {isTab && (
              <div data-testid="tab-bar" style={{ display: 'flex', borderTop: '1px solid rgba(128,128,128,0.25)' }}>
                {screens.map((s, i) => (
                  <button
                    key={s.name}
                    type="button"
                    data-tab={s.name}
                    role="tab"
                    aria-selected={i === tabIndex}
                    onClick={() => {
                      setTabIndex(i);
                      setStack([{ key: `r${routeSeq++}`, name: s.name, params: {} }]);
                    }}
                    style={{
                      flex: 1, padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer',
                      color: i === tabIndex ? '#C9A86C' : '#888', fontWeight: i === tabIndex ? 700 : 400, fontSize: 13,
                    }}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </ParentNavContext.Provider>
      );
    },
  };
  return Nav;
}
