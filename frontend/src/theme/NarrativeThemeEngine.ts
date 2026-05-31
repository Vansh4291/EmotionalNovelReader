import { EmotionType } from '../core/types';
import { NarrativeArc } from '../core/narration/NarrativeContextManager';

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
}

export interface NarrativeTheme {
  name: string;
  colors: NarrativeColors;
  typography: TypographyScale;
  spacing: SpacingScale;
  animation: AnimationConfig;
}

export interface TypographyScale {
  storyFont: string;
  uiFont: string;
  storySize: number;
  storyLineHeight: number;
  storyLetterSpacing: number;
  h1: number;
  h2: number;
  h3: number;
  body: number;
  caption: number;
  tiny: number;
}

export interface SpacingScale {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  storyPadding: number;
  controlPadding: number;
}

export interface AnimationConfig {
  durationFast: number;
  durationNormal: number;
  durationSlow: number;
  durationAtmospheric: number;
  easing: string;
}

const EMOTION_PALETTES: Record<EmotionType, {
  background: string;
  surface: string;
  accent: string;
  glow: string;
  muted: string;
}> = {
  joy: {
    background: '#1a1812',
    surface: '#2a2620',
    accent: '#d4a853',
    glow: 'rgba(212, 168, 83, 0.12)',
    muted: 'rgba(212, 168, 83, 0.06)',
  },
  sadness: {
    background: '#14161e',
    surface: '#1e2030',
    accent: '#6b7db3',
    glow: 'rgba(107, 125, 179, 0.10)',
    muted: 'rgba(107, 125, 179, 0.05)',
  },
  anger: {
    background: '#1c1412',
    surface: '#2a1c18',
    accent: '#c47a5a',
    glow: 'rgba(196, 122, 90, 0.10)',
    muted: 'rgba(196, 122, 90, 0.05)',
  },
  fear: {
    background: '#141618',
    surface: '#1c1e24',
    accent: '#7a8fa0',
    glow: 'rgba(122, 143, 160, 0.10)',
    muted: 'rgba(122, 143, 160, 0.05)',
  },
  surprise: {
    background: '#18161e',
    surface: '#222030',
    accent: '#a08cc0',
    glow: 'rgba(160, 140, 192, 0.12)',
    muted: 'rgba(160, 140, 192, 0.06)',
  },
  neutral: {
    background: '#181818',
    surface: '#222222',
    accent: '#a0a0a0',
    glow: 'rgba(160, 160, 160, 0.06)',
    muted: 'rgba(160, 160, 160, 0.03)',
  },
};

const ARC_MODIFIERS: Record<NarrativeArc['arcPosition'], {
  brightnessShift: number;
  saturationShift: number;
  tensionOverlay: string;
}> = {
  beginning: {
    brightnessShift: 0,
    saturationShift: 0,
    tensionOverlay: 'transparent',
  },
  rising: {
    brightnessShift: -0.02,
    saturationShift: 0.05,
    tensionOverlay: 'rgba(180, 60, 40, 0.02)',
  },
  peak: {
    brightnessShift: -0.04,
    saturationShift: 0.08,
    tensionOverlay: 'rgba(200, 50, 30, 0.04)',
  },
  falling: {
    brightnessShift: 0.01,
    saturationShift: -0.03,
    tensionOverlay: 'rgba(80, 100, 140, 0.02)',
  },
  resolution: {
    brightnessShift: 0.02,
    saturationShift: -0.05,
    tensionOverlay: 'transparent',
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
      text: '#e8e4de',
      textSecondary: '#b0a89c',
      textMuted: '#787068',
      accent: palette.accent,
      accentSubtle: palette.muted,
      border: `rgba(255, 255, 255, ${0.04 + tensionIntensity * 0.03})`,
      borderSubtle: 'rgba(255, 255, 255, 0.02)',
      emotion,
      emotionGlow: palette.glow,
      emotionMuted: palette.muted,
    };

    return {
      name: `narrative_${emotion}`,
      colors,
      typography: this.buildTypography(arc),
      spacing: this.buildSpacing(arc),
      animation: this.buildAnimation(arc),
    };
  }

  private buildTypography(arc?: NarrativeArc | null): TypographyScale {
    const tension = arc?.currentTension || 0;
    const isHighTension = tension > 0.6;

    return {
      storyFont: 'Cormorant Garamond',
      uiFont: 'Inter',
      storySize: isHighTension ? 19 : 20,
      storyLineHeight: isHighTension ? 1.65 : 1.75,
      storyLetterSpacing: isHighTension ? 0.2 : 0.3,
      h1: 28,
      h2: 22,
      h3: 18,
      body: 16,
      caption: 13,
      tiny: 11,
    };
  }

  private buildSpacing(arc?: NarrativeArc | null): SpacingScale {
    const isDialogue = arc?.dialogueActive;

    return {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
      storyPadding: isDialogue ? 28 : 32,
      controlPadding: 20,
    };
  }

  private buildAnimation(arc?: NarrativeArc | null): AnimationConfig {
    const tension = arc?.currentTension || 0;
    const speedFactor = 1 - tension * 0.3;

    return {
      durationFast: Math.round(150 * speedFactor),
      durationNormal: Math.round(300 * speedFactor),
      durationSlow: Math.round(600 * speedFactor),
      durationAtmospheric: Math.round(1200 * speedFactor),
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
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
