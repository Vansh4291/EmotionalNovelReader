import React, { createContext, useContext } from 'react';
import { Platform } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';

const NARRATIVE_FONT = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const UI_FONT = Platform.select({ ios: 'Inter', android: 'sans-serif', default: 'sans-serif' });

const THEMES = {
  dark: {
    background: '#090909',
    surface: '#111111',
    surfaceLight: '#181818',
    surfaceElevated: '#222222',
    primary: '#C9A86C',
    text: '#EAEAEA',
    textSecondary: '#D6D6D6',
    textMuted: '#888888',
    border: '#222222',
    danger: '#B33A3A',
    warning: '#A3874A',
    narrativeFont: NARRATIVE_FONT,
    uiFont: UI_FONT,
    emotionJoy: '#A3874A',
    emotionSadness: '#5B7B9A',
    emotionAnger: '#8B3A3A',
    emotionFear: '#6B4F7A',
    emotionSurprise: '#5B8A5B',
    emotionNeutral: '#888888',
  },
  light: {
    background: '#F5F0EB',
    surface: '#FAF6F0',
    surfaceLight: '#F0EAE0',
    surfaceElevated: '#E8E0D4',
    primary: '#8B6F47',
    text: '#1C1914',
    textSecondary: '#4A4440',
    textMuted: '#8A8480',
    border: '#E0D8CC',
    danger: '#B33A3A',
    warning: '#A3874A',
    narrativeFont: NARRATIVE_FONT,
    uiFont: UI_FONT,
    emotionJoy: '#8B6F47',
    emotionSadness: '#5B7B9A',
    emotionAnger: '#8B3A3A',
    emotionFear: '#6B4F7A',
    emotionSurprise: '#5B8A5B',
    emotionNeutral: '#8A8480',
  },
  sepia: {
    background: '#F4ECD8',
    surface: '#FAF6EB',
    surfaceLight: '#E8DCC8',
    surfaceElevated: '#DCD0BC',
    primary: '#8B5A2B',
    text: '#3D2914',
    textSecondary: '#5C4026',
    textMuted: '#7A6548',
    border: '#D4C4A8',
    danger: '#A94442',
    warning: '#B7791F',
    narrativeFont: NARRATIVE_FONT,
    uiFont: UI_FONT,
    emotionJoy: '#B7791F',
    emotionSadness: '#6B8E23',
    emotionAnger: '#A94442',
    emotionFear: '#6B5B95',
    emotionSurprise: '#8B5A2B',
    emotionNeutral: '#7A6548',
  },
};

const ThemeContext = createContext(THEMES.dark);

export const ThemeProvider = ({ children }) => {
  const theme = useSettingsStore((state) => state.theme);
  const currentTheme = THEMES[theme] || THEMES.dark;

  return (
    <ThemeContext.Provider value={currentTheme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export { THEMES };
export default ThemeContext;
