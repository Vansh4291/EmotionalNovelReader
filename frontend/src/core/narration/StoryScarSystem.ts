import { EmotionType } from '../types';
import { NarrativeFingerprint } from './NarrativeIdentityEngine';
import { EventGovernor } from '../events/EventGovernor';

export interface StoryScar {
  bookId: string;
  type: ScarType;
  intensity: number;
  emotion: EmotionType;
  createdAt: number;
  fadeStartedAt: number;
  fadeDuration: number;
  active: boolean;
}

export type ScarType =
  | 'devastation'
  | 'profound_joy'
  | 'lingering_fear'
  | 'quiet_grief'
  | 'unsettled_ending'
  | 'hopeful_resolution'
  | 'deep_intimacy'
  | 'moral_weight';

interface ScarProfile {
  fadeDuration: number;
  intensityDecay: number;
  atmosphericEffect: {
    warmthReduction: number;
    silenceIncrease: number;
    pacingSlowing: number;
    ambientReduction: number;
  };
}

const SCAR_PROFILES: Record<ScarType, ScarProfile> = {
  devastation: {
    fadeDuration: 72 * 3600000,
    intensityDecay: 0.02,
    atmosphericEffect: {
      warmthReduction: 0.3,
      silenceIncrease: 0.4,
      pacingSlowing: 0.2,
      ambientReduction: 0.2,
    },
  },
  profound_joy: {
    fadeDuration: 48 * 3600000,
    intensityDecay: 0.03,
    atmosphericEffect: {
      warmthReduction: -0.2,
      silenceIncrease: 0.1,
      pacingSlowing: 0,
      ambientReduction: -0.1,
    },
  },
  lingering_fear: {
    fadeDuration: 60 * 3600000,
    intensityDecay: 0.025,
    atmosphericEffect: {
      warmthReduction: 0.2,
      silenceIncrease: 0.3,
      pacingSlowing: 0.15,
      ambientReduction: 0.15,
    },
  },
  quiet_grief: {
    fadeDuration: 84 * 3600000,
    intensityDecay: 0.015,
    atmosphericEffect: {
      warmthReduction: 0.25,
      silenceIncrease: 0.35,
      pacingSlowing: 0.25,
      ambientReduction: 0.2,
    },
  },
  unsettled_ending: {
    fadeDuration: 96 * 3600000,
    intensityDecay: 0.012,
    atmosphericEffect: {
      warmthReduction: 0.15,
      silenceIncrease: 0.2,
      pacingSlowing: 0.1,
      ambientReduction: 0.1,
    },
  },
  hopeful_resolution: {
    fadeDuration: 36 * 3600000,
    intensityDecay: 0.04,
    atmosphericEffect: {
      warmthReduction: -0.15,
      silenceIncrease: 0.05,
      pacingSlowing: 0,
      ambientReduction: -0.05,
    },
  },
  deep_intimacy: {
    fadeDuration: 60 * 3600000,
    intensityDecay: 0.02,
    atmosphericEffect: {
      warmthReduction: -0.1,
      silenceIncrease: 0.15,
      pacingSlowing: 0.1,
      ambientReduction: 0,
    },
  },
  moral_weight: {
    fadeDuration: 72 * 3600000,
    intensityDecay: 0.018,
    atmosphericEffect: {
      warmthReduction: 0.2,
      silenceIncrease: 0.25,
      pacingSlowing: 0.15,
      ambientReduction: 0.1,
    },
  },
};

const STORAGE_KEY = 'story_scars';

export class StoryScarSystem {
  private governor: EventGovernor;
  private scars: Map<string, StoryScar[]> = new Map();
  private listeners: Set<(scars: StoryScar[]) => void> = new Set();

  constructor(governor: EventGovernor) {
    this.governor = governor;
    this.loadFromStorage();
  }

  createScar(
    bookId: string,
    fingerprint: NarrativeFingerprint,
    finalEmotion: EmotionType
  ): StoryScar | null {
    const scarType = this.determineScarType(fingerprint, finalEmotion);
    if (!scarType) return null;

    const profile = SCAR_PROFILES[scarType];
    const intensity = this.computeScarIntensity(fingerprint, finalEmotion);

    const scar: StoryScar = {
      bookId,
      type: scarType,
      intensity,
      emotion: finalEmotion,
      createdAt: Date.now(),
      fadeStartedAt: Date.now() + profile.fadeDuration * 0.3,
      fadeDuration: profile.fadeDuration,
      active: true,
    };

    const bookScars = this.scars.get(bookId) || [];
    bookScars.push(scar);
    this.scars.set(bookId, bookScars);

    this.saveToStorage();

    this.governor.publish('scar:created', {
      bookId,
      type: scarType,
      intensity,
    }, 'StoryScarSystem', 'normal');

    this.notifyListeners(bookScars);
    return scar;
  }

  private determineScarType(
    fingerprint: NarrativeFingerprint,
    finalEmotion: EmotionType
  ): ScarType | null {
    const es = fingerprint.emotionalSignature;
    const td = fingerprint.thematicDensity;
    const si = fingerprint.silenceProfile;

    if (es.melancholyIndex > 0.5 && es.tensionIndex > 0.4) {
      return 'devastation';
    }

    if (es.warmthIndex > 0.5 && finalEmotion === 'joy') {
      return 'profound_joy';
    }

    if (es.tensionIndex > 0.5 && finalEmotion === 'fear') {
      return 'lingering_fear';
    }

    if (es.melancholyIndex > 0.4 && si.contemplativeSilence > 0.2) {
      return 'quiet_grief';
    }

    if (es.arcPattern === 'oscillating' && si.silenceFrequency > 0.3) {
      return 'unsettled_ending';
    }

    if (es.arcPattern === 'declining' && es.warmthIndex > 0.3) {
      return 'hopeful_resolution';
    }

    if (td.emotionalDepth > 0.5 && td.dialogueRatio > 0.3) {
      return 'deep_intimacy';
    }

    if (es.tensionIndex > 0.3 && td.actionRatio > 0.3) {
      return 'moral_weight';
    }

    return null;
  }

  private computeScarIntensity(
    fingerprint: NarrativeFingerprint,
    finalEmotion: EmotionType
  ): number {
    const es = fingerprint.emotionalSignature;
    const nw = fingerprint.narrativeWeight;

    const emotionIntensity = finalEmotion !== 'neutral' ? 0.6 : 0.3;
    const weightIntensity = nw;
    const volatilityBonus = es.volatility * 0.2;

    return Math.min(1.0, emotionIntensity + weightIntensity + volatilityBonus);
  }

  getActiveScars(bookId: string): StoryScar[] {
    const bookScars = this.scars.get(bookId) || [];
    this.updateFadeState(bookScars);
    return bookScars.filter((s) => s.active);
  }

  getAllActiveScars(): StoryScar[] {
    const allScars: StoryScar[] = [];
    for (const bookScars of this.scars.values()) {
      this.updateFadeState(bookScars);
      allScars.push(...bookScars.filter((s) => s.active));
    }
    return allScars;
  }

  getScarModifier(bookId: string): {
    warmthReduction: number;
    silenceIncrease: number;
    pacingSlowing: number;
    ambientReduction: number;
  } {
    const activeScars = this.getActiveScars(bookId);
    if (activeScars.length === 0) {
      return { warmthReduction: 0, silenceIncrease: 0, pacingSlowing: 0, ambientReduction: 0 };
    }

    let warmthReduction = 0;
    let silenceIncrease = 0;
    let pacingSlowing = 0;
    let ambientReduction = 0;

    for (const scar of activeScars) {
      const profile = SCAR_PROFILES[scar.type];
      const effect = profile.atmosphericEffect;
      const factor = scar.intensity;

      warmthReduction += effect.warmthReduction * factor;
      silenceIncrease += effect.silenceIncrease * factor;
      pacingSlowing += effect.pacingSlowing * factor;
      ambientReduction += effect.ambientReduction * factor;
    }

    return {
      warmthReduction: Math.max(-0.5, Math.min(0.5, warmthReduction)),
      silenceIncrease: Math.max(0, Math.min(0.5, silenceIncrease)),
      pacingSlowing: Math.max(0, Math.min(0.5, pacingSlowing)),
      ambientReduction: Math.max(0, Math.min(0.5, ambientReduction)),
    };
  }

  hasActiveScars(bookId: string): boolean {
    return this.getActiveScars(bookId).length > 0;
  }

  private updateFadeState(scars: StoryScar[]): void {
    const now = Date.now();

    for (const scar of scars) {
      if (!scar.active) continue;

      if (now < scar.fadeStartedAt) continue;

      const elapsed = now - scar.fadeStartedAt;
      const fadeProgress = Math.min(1, elapsed / scar.fadeDuration);

      scar.intensity = Math.max(0, scar.intensity * (1 - fadeProgress * 0.01));

      if (scar.intensity < 0.05) {
        scar.active = false;
      }
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          for (const [key, value] of Object.entries(parsed)) {
            this.scars.set(key, value as StoryScar[]);
          }
        }
      }
    } catch (e) {
      console.error('[StoryScarSystem] Failed to load:', e);
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        const obj = Object.fromEntries(this.scars);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
      }
    } catch (e) {
      console.error('[StoryScarSystem] Failed to save:', e);
    }
  }

  subscribe(listener: (scars: StoryScar[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(scars: StoryScar[]): void {
    for (const listener of this.listeners) {
      try {
        listener(scars);
      } catch (e) {
        console.error('[StoryScarSystem] Listener error:', e);
      }
    }
  }

  clearBook(bookId: string): void {
    this.scars.delete(bookId);
    this.saveToStorage();
  }

  destroy(): void {
    this.scars.clear();
    this.listeners.clear();
  }
}
