export const emotionalInk = {
  neutral: '#E7E2DA',
  joy: '#E8D9B4',
  warmth: '#E5B985',
  sadness: '#9FA8B5',
  fear: '#B6B5B0',
  anger: '#C99080',
  awe: '#A8B6C4',
  grief: '#8A857A',
  hope: '#D4C9A8',
  love: '#D9A89A',
} as const;

export type EmotionalInk = keyof typeof emotionalInk;

export const weatherTint = {
  spring: 'rgba(170, 195, 170, 0.06)',
  summer: 'rgba(220, 195, 130, 0.05)',
  autumn: 'rgba(170, 120, 80, 0.06)',
  winter: 'rgba(150, 165, 190, 0.06)',
  thaw: 'rgba(180, 200, 190, 0.05)',
  storm: 'rgba(120, 80, 80, 0.07)',
  stillness: 'rgba(120, 120, 140, 0.05)',
} as const;

export const ambientTemperature = {
  cold: 0.2,
  cool: 0.4,
  mild: 0.5,
  warm: 0.65,
  hot: 0.85,
} as const;

export const narrativeBreath = {
  inhaleMs: 1800,
  holdMs: 600,
  exhaleMs: 1800,
  paragraphExpandRatio: 1.08,
  paragraphCompactRatio: 0.96,
} as const;

export const dialogue = {
  indentPx: 16,
  marginTopPx: 4,
  marginBottomPx: 12,
  italicOpacity: 0.92,
  intensityItalicThreshold: 0.7,
} as const;
