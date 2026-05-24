import React, { createContext, useContext } from 'react';
import { useSettingsStore } from '../store/settingsStore';

const THEMES = {
  dark: {
    background: '#0A0A0A', // Deep OLED Black
    surface: '#171717',    // Sleek Charcoal
    surfaceLight: '#262626', // Elevated Card
    primary: '#00E5FF',    // Vibrant Cyan Neon
    text: '#FFFFFF',
    textSecondary: '#A3A3A3',
    textMuted: '#525252',
    border: '#262626',
    danger: '#FF2A5F',     // Neon Pink/Red
    warning: '#FFD700',
    emotionJoy: '#FFD700',     // Bright Gold
    emotionSadness: '#00BFFF', // Deep Sky Blue
    emotionAnger: '#FF2A5F',   // Neon Red
    emotionFear: '#9D00FF',    // Neon Purple
    emotionSurprise: '#00FF7F', // Spring Green
    emotionNeutral: '#A3A3A3',
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

console.log('ThemeProvider loaded');
export const ThemeProvider = ({ children }) => {
  const theme = useSettingsStore((state) => state.theme);
  const currentTheme = THEMES[theme] || THEMES.dark;
  console.log('ThemeProvider render, theme:', theme, 'currentTheme:', currentTheme?.background);
  
  return (
    <ThemeContext.Provider value={currentTheme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export { THEMES };
export default ThemeContext;