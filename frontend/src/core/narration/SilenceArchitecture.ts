import { EmotionType } from '../types';
import { EventGovernor } from '../events/EventGovernor';

export type SilenceType =
  | 'post_confession'
  | 'grief'
  | 'dread'
  | 'awe'
  | 'contemplation'
  | 'transition'
  | 'absence'
  | 'waiting';

export interface SilenceProfile {
  type: SilenceType;
  intensity: number;
  duration: number;
  breathDepth: number;
  ambientVolume: number;
  transitionSpeed: number;
}

export interface SilenceContext {
  previousEmotion: EmotionType;
  currentEmotion: EmotionType;
  tensionBefore: number;
  tensionAfter: number;
  isDialogueTransition: boolean;
  chapterBoundary: boolean;
}

const SILENCE_PROFILES: Record<SilenceType, {
  intensity: number;
  duration: number;
  breathDepth: number;
  ambientVolume: number;
  transitionSpeed: number;
}> = {
  post_confession: {
    intensity: 0.7,
    duration: 1200,
    breathDepth: 0.8,
    ambientVolume: 0.3,
    transitionSpeed: 0.6,
  },
  grief: {
    intensity: 0.9,
    duration: 1500,
    breathDepth: 0.9,
    ambientVolume: 0.2,
    transitionSpeed: 0.4,
  },
  dread: {
    intensity: 0.8,
    duration: 1000,
    breathDepth: 0.7,
    ambientVolume: 0.15,
    transitionSpeed: 0.5,
  },
  awe: {
    intensity: 0.6,
    duration: 1300,
    breathDepth: 0.6,
    ambientVolume: 0.4,
    transitionSpeed: 0.7,
  },
  contemplation: {
    intensity: 0.5,
    duration: 800,
    breathDepth: 0.5,
    ambientVolume: 0.5,
    transitionSpeed: 0.8,
  },
  transition: {
    intensity: 0.3,
    duration: 600,
    breathDepth: 0.3,
    ambientVolume: 0.6,
    transitionSpeed: 1.0,
  },
  absence: {
    intensity: 0.4,
    duration: 700,
    breathDepth: 0.4,
    ambientVolume: 0.4,
    transitionSpeed: 0.7,
  },
  waiting: {
    intensity: 0.6,
    duration: 900,
    breathDepth: 0.5,
    ambientVolume: 0.35,
    transitionSpeed: 0.6,
  },
};

export class SilenceArchitecture {
  private governor: EventGovernor;
  private currentSilence: SilenceProfile | null = null;
  private silenceHistory: Array<{
    type: SilenceType;
    timestamp: number;
    context: SilenceContext;
  }> = [];
  private listeners: Set<(silence: SilenceProfile | null) => void> = new Set();

  constructor(governor: EventGovernor) {
    this.governor = governor;
  }

  analyzeTransition(
    previousEmotion: EmotionType,
    currentEmotion: EmotionType,
    previousIntensity: number,
    currentIntensity: number,
    isDialogueTransition: boolean,
    chapterBoundary: boolean
  ): SilenceProfile | null {
    const context: SilenceContext = {
      previousEmotion,
      currentEmotion,
      tensionBefore: previousIntensity,
      tensionAfter: currentIntensity,
      isDialogueTransition,
      chapterBoundary,
    };

    const silenceType = this.classifySilence(context);

    if (!silenceType) {
      this.currentSilence = null;
      return null;
    }

    const profile = this.buildSilenceProfile(silenceType, context);
    this.currentSilence = profile;

    this.silenceHistory.push({
      type: silenceType,
      timestamp: Date.now(),
      context,
    });

    if (this.silenceHistory.length > 50) {
      this.silenceHistory.shift();
    }

    this.governor.publish('silence:detected', {
      type: silenceType,
      intensity: profile.intensity,
      duration: profile.duration,
    }, 'SilenceArchitecture', 'low');

    this.notifyListeners(profile);
    return profile;
  }

  private classifySilence(context: SilenceContext): SilenceType | null {
    const { previousEmotion, currentEmotion, tensionBefore, tensionAfter, chapterBoundary } = context;

    if (chapterBoundary) {
      return 'transition';
    }

    if (previousEmotion === 'fear' && currentEmotion === 'neutral' && tensionBefore > 0.5) {
      return 'dread';
    }

    if (previousEmotion === 'sadness' && currentEmotion === 'neutral' && tensionBefore > 0.6) {
      return 'grief';
    }

    if (previousEmotion === 'anger' && currentEmotion === 'neutral' && tensionBefore > 0.5) {
      return 'post_confession';
    }

    if (previousEmotion === 'surprise' && currentEmotion === 'neutral') {
      return 'awe';
    }

    if (previousEmotion === 'neutral' && currentEmotion === 'neutral') {
      if (tensionBefore > 0.3 && tensionAfter < 0.2) {
        return 'contemplation';
      }
      return null;
    }

    if (tensionBefore > 0.4 && tensionAfter < 0.2) {
      return 'absence';
    }

    if (tensionBefore < 0.2 && tensionAfter > 0.4) {
      return 'waiting';
    }

    return null;
  }

  private buildSilenceProfile(
    type: SilenceType,
    context: SilenceContext
  ): SilenceProfile {
    const base = SILENCE_PROFILES[type];

    const tensionDiff = Math.abs(context.tensionBefore - context.tensionAfter);
    const intensityModifier = 0.7 + tensionDiff * 0.6;

    return {
      type,
      intensity: Math.min(1.0, base.intensity * intensityModifier),
      duration: Math.round(base.duration * (0.8 + tensionDiff * 0.4)),
      breathDepth: Math.min(1.0, base.breathDepth * intensityModifier),
      ambientVolume: base.ambientVolume,
      transitionSpeed: base.transitionSpeed,
    };
  }

  getCurrentSilence(): SilenceProfile | null {
    return this.currentSilence;
  }

  getSilenceHistory(): Array<{
    type: SilenceType;
    timestamp: number;
    context: SilenceContext;
  }> {
    return [...this.silenceHistory];
  }

  getRecentSilenceTypes(): SilenceType[] {
    const recent = this.silenceHistory.slice(-5);
    return recent.map((s) => s.type);
  }

  hasPostTensionSilence(): boolean {
    const recent = this.silenceHistory.slice(-3);
    return recent.some(
      (s) => s.type === 'grief' || s.type === 'dread' || s.type === 'post_confession'
    );
  }

  subscribe(listener: (silence: SilenceProfile | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(silence: SilenceProfile | null): void {
    for (const listener of this.listeners) {
      try {
        listener(silence);
      } catch (e) {
        console.error('[SilenceArchitecture] Listener error:', e);
      }
    }
  }

  reset(): void {
    this.currentSilence = null;
    this.silenceHistory = [];
  }

  destroy(): void {
    this.reset();
    this.listeners.clear();
  }
}
