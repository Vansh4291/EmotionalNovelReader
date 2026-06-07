export const opacity = {
  hidden: 0,
  ghost: 0.12,
  whisper: 0.28,
  dim: 0.48,
  secondary: 0.72,
  primary: 0.92,
  full: 1,
} as const;

export const hierarchyOpacity = {
  focus: opacity.primary,
  context: 0.32,
  ambient: 0.18,
  controls: 0.92,
  chrome: 0.55,
} as const;

export const atmosphereOpacity = {
  emotionGlowMax: 0.14,
  emotionGlowMin: 0.04,
  tensionOverlay: 0.04,
  vignetteEdge: 0.55,
  vignetteCenter: 0,
  proseDim: 0.6,
  proseContext: 0.32,
  proseNext: 0.22,
  proseOpacity: 0.92,
  ritualText: 1.0,
  bordersSubtle: 0.04,
  bordersDefault: 0.06,
  activeBorder: 0.18,
} as const;
