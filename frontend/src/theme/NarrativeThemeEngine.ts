import { EmotionType } from '../core/types';
import { NarrativeArc } from '../core/narration/NarrativeContextManager';
import {
  spacing as spacingTokens,
  fontSize,
  lineHeight,
  letterSpacing,
  duration,
  easing,
  motion as motionTokens,
  atmosphereOpacity,
  semanticRadii,
  borderWidth,
  semanticSpacing,
  emotionalInk,
  dialogue,
  measure,
  narrative as narrativeInk,
} from '../design';

export interface NarrativeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSubtle: string;
  border: string;
  borderSubtle: string;
  emotion: EmotionType;
  emotionGlow: string;
  emotionMuted: string;
  emotionalInk: string;
}

export interface NarrativeTheme {
  name: string;
  colors: NarrativeColors;
  typography: TypographyScale;
  spacing: SpacingScale;
  animation: AnimationConfig;
  measure: MeasureConfig;
}

export interface TypographyScale {
  storyFont: string;
  uiFont: string;
  storySize: number;
  storyLineHeight: number;
  storyLetterSpacing: number;
  display: number;
  h1: number;
  h2: number;
  h3: number;
  body: number;
  secondary: number;
  caption: number;
  micro: number;
}

export interface SpacingScale {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  cinematic: number;
  storyPadding: number;
  controlPadding: number;
  pageGutter: number;
  sectionGap: number;
}

export interface AnimationConfig {
  durationFast: number;
  durationNormal: number;
  durationSlow: number;
  durationAtmospheric: number;
  durationBreath: number;
  easing: string;
  easingBreath: string;
  breathPeriodMs: number;
  focusIdleMs: number;
  lastLineHoldMs: number;
}

export interface MeasureConfig {
  proseMaxWidthPx: number;
  proseMinWidthPx: number;
  proseMinChars: number;
  proseMaxChars: number;
}

const EMOTION_PALETTES: Record<EmotionType, {
  background: string;
  surface: string;
  accent: string;
  glow: string;
  muted: string;
  ink: string;
}> = {
  joy: {
    background: '#18160F',
    surface: '#1F1C14',
    accent: '#D4A853',
    glow: 'rgba(212, 168, 83, 0.10)',
    muted: 'rgba(212, 168, 83, 0.04)',
    ink: emotionalInk.warmth,
  },
  sadness: {
    background: '#13151C',
    surface: '#181B24',
    accent: '#7C8AA5',
    glow: 'rgba(124, 138, 165, 0.08)',
    muted: 'rgba(124, 138, 165, 0.04)',
    ink: emotionalInk.sadness,
  },
  anger: {
    background: '#1A1412',
    surface: '#221A18',
    accent: '#B07A60',
    glow: 'rgba(176, 122, 96, 0.08)',
    muted: 'rgba(176, 122, 96, 0.04)',
    ink: emotionalInk.anger,
  },
  fear: {
    background: '#131418',
    surface: '#1A1B20',
    accent: '#8A95A2',
    glow: 'rgba(138, 149, 162, 0.07)',
    muted: 'rgba(138, 149, 162, 0.03)',
    ink: emotionalInk.fear,
  },
  surprise: {
    background: '#16151C',
    surface: '#1F1D26',
    accent: '#A89AB8',
    glow: 'rgba(168, 154, 184, 0.08)',
    muted: 'rgba(168, 154, 184, 0.03)',
    ink: emotionalInk.awe,
  },
  neutral: {
    background: '#131211',
    surface: '#1A1817',
    accent: '#C9BFAE',
    glow: 'rgba(201, 191, 174, 0.05)',
    muted: 'rgba(201, 191, 174, 0.03)',
    ink: emotionalInk.neutral,
  },
};

const ARC_MODIFIERS: Record<NarrativeArc['arcPosition'], {
  brightnessShift: number;
  saturationShift: number;
  tensionOverlay: string;
  vignetteEdge: string;
}> = {
  beginning: {
    brightnessShift: 0,
    saturationShift: 0,
    tensionOverlay: 'transparent',
    vignetteEdge: 'transparent',
  },
  rising: {
    brightnessShift: -0.02,
    saturationShift: 0.05,
    tensionOverlay: 'rgba(180, 100, 80, 0.02)',
    vignetteEdge: 'rgba(0, 0, 0, 0.18)',
  },
  peak: {
    brightnessShift: -0.04,
    saturationShift: 0.08,
    tensionOverlay: 'rgba(200, 90, 70, 0.04)',
    vignetteEdge: 'rgba(0, 0, 0, 0.32)',
  },
  falling: {
    brightnessShift: 0.01,
    saturationShift: -0.03,
    tensionOverlay: 'rgba(80, 100, 140, 0.02)',
    vignetteEdge: 'rgba(0, 0, 0, 0.20)',
  },
  resolution: {
    brightnessShift: 0.02,
    saturationShift: -0.05,
    tensionOverlay: 'transparent',
    vignetteEdge: 'rgba(0, 0, 0, 0.08)',
  },
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function adjustBrightness(hex: string, shift: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const adjust = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v + v * shift)));

  return `#${adjust(rgb.r).toString(16).padStart(2, '0')}${adjust(rgb.g).toString(16).padStart(2, '0')}${adjust(rgb.b).toString(16).padStart(2, '0')}`;
}

export class NarrativeThemeEngine {
  private currentEmotion: EmotionType = 'neutral';
  private currentArc: NarrativeArc | null = null;
  private themeCache: Map<string, NarrativeTheme> = new Map();
  private listeners: Set<(theme: NarrativeTheme) => void> = new Set();

  getTheme(
    emotion: EmotionType,
    arc?: NarrativeArc | null
  ): NarrativeTheme {
    const key = `${emotion}_${arc?.arcPosition || 'none'}_${arc ? Math.round(arc.currentTension * 10) : 0}`;

    const cached = this.themeCache.get(key);
    if (cached) return cached;

    const theme = this.buildTheme(emotion, arc);
    this.themeCache.set(key, theme);

    if (this.themeCache.size > 50) {
      const firstKey = this.themeCache.keys().next().value;
      if (firstKey) this.themeCache.delete(firstKey);
    }

    return theme;
  }

  updateFromNarration(
    emotion: EmotionType,
    arc: NarrativeArc
  ): NarrativeTheme {
    this.currentEmotion = emotion;
    this.currentArc = arc;

    const theme = this.getTheme(emotion, arc);
    this.notifyListeners(theme);
    return theme;
  }

  private buildTheme(
    emotion: EmotionType,
    arc?: NarrativeArc | null
  ): NarrativeTheme {
    const palette = EMOTION_PALETTES[emotion] || EMOTION_PALETTES.neutral;
    const arcMod = arc ? ARC_MODIFIERS[arc.arcPosition] : ARC_MODIFIERS.beginning;

    const tensionIntensity = arc?.currentTension || 0;
    const brightnessMod = arcMod.brightnessShift * (0.5 + tensionIntensity * 0.5);

    const colors: NarrativeColors = {
      background: adjustBrightness(palette.background, brightnessMod),
      surface: adjustBrightness(palette.surface, brightnessMod),
      surfaceElevated: adjustBrightness(palette.surface, brightnessMod + 0.03),
      text: narrativeInk.text,
      textSecondary: narrativeInk.textSecondary,
      textMuted: narrativeInk.textMuted,
      accent: palette.accent,
      accentSubtle: palette.muted,
      border: `rgba(231, 226, 218, ${atmosphereOpacity.bordersDefault + tensionIntensity * 0.04})`,
      borderSubtle: `rgba(231, 226, 218, ${atmosphereOpacity.bordersSubtle})`,
      emotion,
      emotionGlow: palette.glow,
      emotionMuted: palette.muted,
      emotionalInk: palette.ink,
    };

    return {
      name: `narrative_${emotion}`,
      colors,
      typography: this.buildTypography(arc),
      spacing: this.buildSpacing(arc),
      animation: this.buildAnimation(arc),
      measure: this.buildMeasure(),
    };
  }

  private buildTypography(arc?: NarrativeArc | null): TypographyScale {
    const tension = arc?.currentTension || 0;
    const isHighTension = tension > 0.6;

    return {
      storyFont: 'Cormorant Garamond',
      uiFont: 'Inter',
      storySize: isHighTension ? fontSize.body : fontSize.body,
      storyLineHeight: isHighTension ? lineHeight.body : lineHeight.body + 0.05,
      storyLetterSpacing: isHighTension ? letterSpacing.wide : letterSpacing.wide + 0.05,
      display: fontSize.display,
      h1: fontSize.chapterTitle,
      h2: fontSize.sectionTitle,
      h3: fontSize.body,
      body: fontSize.body,
      secondary: fontSize.secondary,
      caption: fontSize.micro,
      micro: fontSize.micro,
    };
  }

  private buildSpacing(arc?: NarrativeArc | null): SpacingScale {
    const isDialogue = arc?.dialogueActive;

    return {
      xs: spacingTokens.xs,
      sm: spacingTokens.sm,
      md: spacingTokens.md,
      lg: spacingTokens.lg,
      xl: spacingTokens.xl,
      xxl: spacingTokens.xxl,
      cinematic: spacingTokens.cinematic,
      storyPadding: isDialogue ? spacingTokens.lg : spacingTokens.xl,
      controlPadding: spacingTokens.lg,
      pageGutter: semanticSpacing.pageGutter,
      sectionGap: semanticSpacing.sectionGap,
    };
  }

  private buildAnimation(arc?: NarrativeArc | null): AnimationConfig {
    const tension = arc?.currentTension || 0;
    const speedFactor = 1 - tension * 0.3;

    return {
      durationFast: Math.round(duration.fast * speedFactor),
      durationNormal: Math.round(duration.normal * speedFactor),
      durationSlow: Math.round(duration.slow * speedFactor),
      durationAtmospheric: Math.round(duration.cinematic * speedFactor),
      durationBreath: motionTokens.breathPeriodMs,
      easing: easing.standard,
      easingBreath: easing.breath,
      breathPeriodMs: motionTokens.breathPeriodMs,
      focusIdleMs: motionTokens.focusIdleMs,
      lastLineHoldMs: motionTokens.lastLineHoldMs,
    };
  }

  private buildMeasure(): MeasureConfig {
    return {
      proseMaxWidthPx: measure.proseColumnPx,
      proseMinWidthPx: measure.proseMin,
      proseMinChars: measure.proseMin,
      proseMaxChars: measure.proseMax,
    };
  }

  subscribe(listener: (theme: NarrativeTheme) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(theme: NarrativeTheme): void {
    for (const listener of this.listeners) {
      try {
        listener(theme);
      } catch (e) {
        console.error('[NarrativeThemeEngine] Listener error:', e);
      }
    }
  }

  getCurrentEmotion(): EmotionType {
    return this.currentEmotion;
  }

  getCurrentArc(): NarrativeArc | null {
    return this.currentArc;
  }

  reset(): void {
    this.currentEmotion = 'neutral';
    this.currentArc = null;
    this.themeCache.clear();
  }
}

export const _internal = {
  EMOTION_PALETTES,
  ARC_MODIFIERS,
  spacingTokens,
  fontSize,
  lineHeight,
  letterSpacing,
  duration,
  easing,
  motionTokens,
  atmosphereOpacity,
  semanticRadii,
  borderWidth,
  dialogue,
  measure,
  narrativeInk,
  emotionalInk,
};
