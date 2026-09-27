import { create } from 'zustand';

export const useSettingsStore = create((set) => ({
  defaultVoiceEngine: 'android',
  defaultSpeed: 1.0,
  defaultPitch: 1.0,
  defaultVolume: 1.0,
  emotionEffectsEnabled: true,
  highlightSyncEnabled: true,
  lastLineRitualEnabled: true,
  theme: 'dark',
  readerFontSize: 18,
  readerLineHeight: 1.6,

  setDefaultVoiceEngine: (engine) => set({ defaultVoiceEngine: engine }),
  setDefaultSpeed: (speed) => set({ defaultSpeed: speed }),
  setDefaultPitch: (pitch) => set({ defaultPitch: pitch }),
  setDefaultVolume: (volume) => set({ defaultVolume: volume }),
  setEmotionEffectsEnabled: (enabled) => set({ emotionEffectsEnabled: enabled }),
  setHighlightSyncEnabled: (enabled) => set({ highlightSyncEnabled: enabled }),
  setLastLineRitualEnabled: (enabled) => set({ lastLineRitualEnabled: enabled }),
  setTheme: (theme) => set({ theme }),
  setReaderFontSize: (size) => set({ readerFontSize: Math.max(14, Math.min(32, size)) }),
  setReaderLineHeight: (lh) => set({ readerLineHeight: Math.max(1.2, Math.min(2.2, lh)) }),
}));