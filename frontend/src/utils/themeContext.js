import React, { createContext, useContext } from 'react';
import { useSettingsStore } from '../store/settingsStore';

const THEMES = {
  dark: {
    background: '#16213e',
    surface: '#1a1a2e',
    surfaceLight: '#2d3a5c',
    primary: '#4ade80',
    text: '#ffffff',
    textSecondary: '#a0aec0',
    textMuted: '#718096',
    border: '#2d3a5c',
    danger: '#ef4444',
    warning: '#f59e0b',
    emotionJoy: '#fbbf24',
    emotionSadness: '#60a5fa',
    emotionAnger: '#f87171',
    emotionFear: '#a78bfa',
    emotionSurprise: '#34d399',
    emotionNeutral: '#94a3b8',
  },
  light: {
    background: '#f7fafc',
    surface: '#ffffff',
    surfaceLight: '#e2e8f0',
    primary: '#38a169',
    text: '#1a202c',
    textSecondary: '#4a5568',
    textMuted: '#718096',
    border: '#e2e8f0',
    danger: '#e53e3e',
    warning: '#dd6b20',
    emotionJoy: '#d69e2e',
    emotionSadness: '#3182ce',
    emotionAnger: '#e53e3e',
    emotionFear: '#805ad5',
    emotionSurprise: '#38a169',
    emotionNeutral: '#718096',
  },
  sepia: {
    background: '#f4ecd8',
    surface: '#faf6eb',
    surfaceLight: '#e8dcc8',
    primary: '#8b5a2b',
    text: '#3d2914',
    textSecondary: '#5c4026',
    textMuted: '#7a6548',
    border: '#d4c4a8',
    danger: '#a94442',
    warning: '#b7791f',
    emotionJoy: '#b7791f',
    emotionSadness: '#6b8e23',
    emotionAnger: '#a94442',
    emotionFear: '#6b5b95',
    emotionSurprise: '#8b5a2b',
    emotionNeutral: '#7a6548',
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