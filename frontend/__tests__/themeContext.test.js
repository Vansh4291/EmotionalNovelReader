import React from 'react';
import renderer from 'react-test-renderer';
import { THEMES } from '../src/utils/themeContext.js';

describe('THEMES', () => {
  test('has dark theme with required properties', () => {
    expect(THEMES.dark).toBeDefined();
    expect(THEMES.dark.background).toBe('#090909');
    expect(THEMES.dark.primary).toBe('#C9A86C');
    expect(THEMES.dark.text).toBe('#EAEAEA');
  });

  test('has light theme with required properties', () => {
    expect(THEMES.light).toBeDefined();
    expect(THEMES.light.background).toBe('#F5F0EB');
    expect(THEMES.light.text).toBe('#1C1914');
  });

  test('has sepia theme with required properties', () => {
    expect(THEMES.sepia).toBeDefined();
    expect(THEMES.sepia.background).toBe('#F4ECD8');
    expect(THEMES.sepia.text).toBe('#3D2914');
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
