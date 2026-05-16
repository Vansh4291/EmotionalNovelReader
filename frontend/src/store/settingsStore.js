import { create } from 'zustand';

export const useSettingsStore = create((set) => ({
  defaultVoiceEngine: 'android',
  defaultSpeed: 1.0,
  defaultPitch: 1.0,
  defaultVolume: 1.0,
  emotionEffectsEnabled: true,
  highlightSyncEnabled: true,
  sleepTimerMinutes: 0,
  theme: 'dark',

  setDefaultVoiceEngine: (engine) => set({ defaultVoiceEngine: engine }),
  setDefaultSpeed: (speed) => set({ defaultSpeed: speed }),
  setDefaultPitch: (pitch) => set({ defaultPitch: pitch }),
  setDefaultVolume: (volume) => set({ defaultVolume: volume }),
  setEmotionEffectsEnabled: (enabled) => set({ emotionEffectsEnabled: enabled }),
  setHighlightSyncEnabled: (enabled) => set({ highlightSyncEnabled: enabled }),
  setSleepTimerMinutes: (minutes) => set({ sleepTimerMinutes: minutes }),
  setTheme: (theme) => set({ theme }),
}));