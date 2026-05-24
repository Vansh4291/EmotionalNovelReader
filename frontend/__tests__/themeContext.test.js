import React from 'react';
import renderer from 'react-test-renderer';
import { THEMES } from '../src/utils/themeContext.js';

describe('THEMES', () => {
  test('has dark theme with required properties', () => {
    expect(THEMES.dark).toBeDefined();
    expect(THEMES.dark.background).toBe('#0A0A0A');
    expect(THEMES.dark.primary).toBe('#00E5FF');
    expect(THEMES.dark.text).toBe('#FFFFFF');
  });

  test('has light theme with required properties', () => {
    expect(THEMES.light).toBeDefined();
    expect(THEMES.light.background).toBe('#f7fafc');
    expect(THEMES.light.text).toBe('#1a202c');
  });

  test('has sepia theme with required properties', () => {
    expect(THEMES.sepia).toBeDefined();
    expect(THEMES.sepia.background).toBe('#f4ecd8');
    expect(THEMES.sepia.text).toBe('#3d2914');
  });

  test('all themes have same emotion color keys', () => {
    const emotionKeys = ['emotionJoy', 'emotionSadness', 'emotionAnger', 'emotionFear', 'emotionSurprise', 'emotionNeutral'];
    ['dark', 'light', 'sepia'].forEach(theme => {
      emotionKeys.forEach(key => {
        expect(THEMES[theme]).toHaveProperty(key);
      });
    });
  });

  test('all themes have required UI keys', () => {
    const uiKeys = ['background', 'surface', 'surfaceLight', 'primary', 'text', 'textSecondary', 'textMuted', 'border', 'danger', 'warning'];
    ['dark', 'light', 'sepia'].forEach(theme => {
      uiKeys.forEach(key => {
        expect(THEMES[theme]).toHaveProperty(key);
      });
    });
  });
});
