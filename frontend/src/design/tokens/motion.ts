export const duration = {
  instant: 80,
  fast: 180,
  normal: 320,
  slow: 600,
  breath: 1400,
  cinematic: 2200,
} as const;

export const easing = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
  breath: 'cubic-bezier(0.45, 0, 0.55, 1)',
} as const;

export const motion = {
  breathPeriodMs: 4200,
  focusIdleMs: 4000,
  controlsRevealMs: 280,
  emotionCrossfadeMs: 900,
  pageTransitionMs: 480,
  lastLineHoldMs: 3000,
  fadeOutControlsOpacity: 0.0,
  fadeInControlsOpacity: 1.0,
  dimmedActiveOpacity: 0.55,
  proseOpacity: 0.92,
} as const;

export const stagger = {
  listItem: 60,
  paragraph: 90,
  character: 18,
} as const;
