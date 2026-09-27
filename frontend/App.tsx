import React, { useEffect, useRef } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator.jsx';
import { ThemeProvider, useTheme, THEMES } from './src/utils/themeContext.js';
import { useSettingsStore } from './src/store/settingsStore.js';
import { loadSettingsFromRealm, saveSettingsToRealm } from './src/database/localDatabase.js';

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  '`new NativeEventEmitter()` was called with a non-null argument without the required `addListener` method.',
  '`new NativeEventEmitter()` was called with a non-null argument without the required `removeListeners` method.',
]);

function AppContent() {
  const theme = useTheme();
  const settings = useSettingsStore();
  const hydratedRef = useRef(false);

  // Hydrate persisted settings into the store exactly once, before the
  // save-effect below is allowed to write anything back.
  useEffect(() => {
    loadSettingsFromRealm().then((saved) => {
      if (saved) {
        if (saved.defaultSpeed !== undefined) settings.setDefaultSpeed(saved.defaultSpeed);
        if (saved.defaultPitch !== undefined) settings.setDefaultPitch(saved.defaultPitch);
        if (saved.defaultVolume !== undefined) settings.setDefaultVolume(saved.defaultVolume);
        if (saved.theme) settings.setTheme(saved.theme);
        if (saved.emotionEffectsEnabled !== undefined) settings.setEmotionEffectsEnabled(saved.emotionEffectsEnabled);
        if (saved.highlightSyncEnabled !== undefined) settings.setHighlightSyncEnabled(saved.highlightSyncEnabled);
        if (saved.readerFontSize !== undefined) settings.setReaderFontSize(saved.readerFontSize);
        if (saved.readerLineHeight !== undefined) settings.setReaderLineHeight(saved.readerLineHeight);
      }
      hydratedRef.current = true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist settings whenever they change (after hydration).
  useEffect(() => {
    if (!hydratedRef.current) return;
    const current = {
      defaultVoiceEngine: settings.defaultVoiceEngine,
      defaultSpeed: settings.defaultSpeed,
      defaultPitch: settings.defaultPitch,
      defaultVolume: settings.defaultVolume,
      emotionEffectsEnabled: settings.emotionEffectsEnabled,
      highlightSyncEnabled: settings.highlightSyncEnabled,
      theme: settings.theme,
      readerFontSize: settings.readerFontSize,
      readerLineHeight: settings.readerLineHeight,
    };
    saveSettingsToRealm(current);
  }, [
    settings.defaultVoiceEngine, settings.defaultSpeed, settings.defaultPitch,
    settings.defaultVolume, settings.emotionEffectsEnabled, settings.highlightSyncEnabled,
    settings.theme, settings.readerFontSize, settings.readerLineHeight,
  ]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar
        barStyle={theme === THEMES.dark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.surface}
        translucent={false}
      />
      <AppNavigator />
    </GestureHandlerRootView>
  );
}

function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;