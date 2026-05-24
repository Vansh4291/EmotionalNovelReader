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
  const savedRef = useRef<Record<string, unknown> | null>(null);

  useEffect(() => {
    loadSettingsFromRealm().then((saved) => {
      if (saved) {
        if (saved.defaultSpeed !== undefined) settings.setDefaultSpeed(saved.defaultSpeed);
        if (saved.defaultPitch !== undefined) settings.setDefaultPitch(saved.defaultPitch);
        if (saved.defaultVolume !== undefined) settings.setDefaultVolume(saved.defaultVolume);
        if (saved.theme) settings.setTheme(saved.theme);
        if (saved.emotionEffectsEnabled !== undefined) settings.setEmotionEffectsEnabled(saved.emotionEffectsEnabled);
        if (saved.highlightSyncEnabled !== undefined) settings.setHighlightSyncEnabled(saved.highlightSyncEnabled);
      }
    });
  }, [settings.setDefaultSpeed, settings.setDefaultPitch, settings.setDefaultVolume, settings.setTheme, settings.setEmotionEffectsEnabled, settings.setHighlightSyncEnabled]);

  useEffect(() => {
    const current = {
      defaultVoiceEngine: settings.defaultVoiceEngine,
      defaultSpeed: settings.defaultSpeed,
      defaultPitch: settings.defaultPitch,
      defaultVolume: settings.defaultVolume,
      emotionEffectsEnabled: settings.emotionEffectsEnabled,
      highlightSyncEnabled: settings.highlightSyncEnabled,
      theme: settings.theme,
    };
    if (savedRef.current === null) {
      savedRef.current = current;
      saveSettingsToRealm(current);
      return;
    }
    if (JSON.stringify(current) === JSON.stringify(savedRef.current)) return;
    savedRef.current = current;
    saveSettingsToRealm(current);
  }, [
    settings.defaultSpeed, settings.defaultPitch, settings.defaultVolume,
    settings.emotionEffectsEnabled, settings.highlightSyncEnabled,
    settings.theme, settings.defaultVoiceEngine, settings.sleepTimerMinutes,
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