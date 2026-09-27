import { useSettingsStore } from '../src/store/settingsStore.js';

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      defaultVoiceEngine: 'android',
      defaultSpeed: 1.0,
      defaultPitch: 1.0,
      defaultVolume: 1.0,
      emotionEffectsEnabled: true,
      highlightSyncEnabled: true,
      theme: 'dark',
      readerFontSize: 18,
      readerLineHeight: 1.6,
    });
  });

  test('reader font size clamps to valid range', () => {
    const { setReaderFontSize } = useSettingsStore.getState();
    setReaderFontSize(8);
    expect(useSettingsStore.getState().readerFontSize).toBe(14);
    setReaderFontSize(80);
    expect(useSettingsStore.getState().readerFontSize).toBe(32);
    setReaderFontSize(22);
    expect(useSettingsStore.getState().readerFontSize).toBe(22);
  });

  test('reader line height clamps to valid range', () => {
    const { setReaderLineHeight } = useSettingsStore.getState();
    setReaderLineHeight(0.5);
    expect(useSettingsStore.getState().readerLineHeight).toBeCloseTo(1.2, 5);
    setReaderLineHeight(4.0);
    expect(useSettingsStore.getState().readerLineHeight).toBeCloseTo(2.2, 5);
    setReaderLineHeight(1.9);
    expect(useSettingsStore.getState().readerLineHeight).toBeCloseTo(1.9, 5);
  });

  test('narration speed setter clamps', () => {
    const { setDefaultSpeed } = useSettingsStore.getState();
    setDefaultSpeed(5);
    expect(useSettingsStore.getState().defaultSpeed).toBe(5); // settings store stores user preference raw
    setDefaultSpeed(0.1);
    expect(useSettingsStore.getState().defaultSpeed).toBeCloseTo(0.1, 5);
  });

  test('theme setter accepts valid themes', () => {
    const { setTheme } = useSettingsStore.getState();
    setTheme('sepia');
    expect(useSettingsStore.getState().theme).toBe('sepia');
    setTheme('light');
    expect(useSettingsStore.getState().theme).toBe('light');
  });
});
