import { EmotionType } from '../types';
import { EventGovernor } from '../events/EventGovernor';

export interface FatigueState {
  overallFatigue: number;
  tensionFatigue: number;
  sadnessFatigue: number;
  fearFatigue: number;
  needsDecompression: boolean;
  decompressionLevel: number;
  recommendedPacing: 'normal' | 'gentle' | 'rest';
}

interface FatigueAccumulator {
  emotion: EmotionType;
  totalIntensity: number;
  sustainedDuration: number;
  consecutiveHigh: number;
}

const FATIGUE_THRESHOLDS = {
  overall: 0.65,
  tension: 0.7,
  sadness: 0.65,
  fear: 0.6,
  consecutiveHighLimit: 8,
  sustainedDurationLimit: 12,
  decompressionCooldown: 5,
};

const EMOTION_FATIGUE_RATES: Record<EmotionType, number> = {
  joy: 0.02,
  sadness: 0.08,
  anger: 0.07,
  fear: 0.09,
  surprise: 0.03,
  neutral: -0.05,
};

const DECOMPRESSION_PROFILES: Record<'gentle' | 'rest', {
  pacingReduction: number;
  ambientBoost: number;
  transitionSlowing: number;
  breathingRoom: number;
}> = {
  gentle: {
    pacingReduction: 0.15,
    ambientBoost: 0.1,
    transitionSlowing: 1.2,
    breathingRoom: 0.3,
  },
  rest: {
    pacingReduction: 0.3,
    ambientBoost: 0.2,
    transitionSlowing: 1.5,
    breathingRoom: 0.5,
  },
};

export class EmotionalFatigueModel {
  private governor: EventGovernor;
  private accumulators: Map<EmotionType, FatigueAccumulator> = new Map();
  private overallFatigue = 0;
  private consecutiveHighCount = 0;
  private decompressionActive = false;
  private decompressionCooldown = 0;
  private listeners: Set<(state: FatigueState) => void> = new Set();

  constructor(governor: EventGovernor) {
    this.governor = governor;
    this.initAccumulators();
  }

  private initAccumulators(): void {
    const emotions: EmotionType[] = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'neutral'];
    for (const emotion of emotions) {
      this.accumulators.set(emotion, {
        emotion,
        totalIntensity: 0,
        sustainedDuration: 0,
        consecutiveHigh: 0,
      });
    }
  }

  processSentence(
    emotion: EmotionType,
    intensity: number
  ): FatigueState {
    this.updateAccumulators(emotion, intensity);
    this.updateOverallFatigue(emotion, intensity);
    this.updateConsecutiveHigh(emotion, intensity);
    this.updateDecompressionState();

    const state = this.buildState();

    this.notifyListeners(state);
    return state;
  }

  private updateAccumulators(emotion: EmotionType, intensity: number): void {
    const accumulator = this.accumulators.get(emotion);
    if (!accumulator) return;

    const fatigueRate = EMOTION_FATIGUE_RATES[emotion] || 0;
    accumulator.totalIntensity += intensity * fatigueRate;

    if (intensity > 0.5) {
      accumulator.sustainedDuration += 1;
      accumulator.consecutiveHigh += 1;
    } else {
      accumulator.sustainedDuration = Math.max(0, accumulator.sustainedDuration - 1);
      accumulator.consecutiveHigh = 0;
    }

    accumulator.totalIntensity = Math.max(0, Math.min(1, accumulator.totalIntensity));
  }

  private updateOverallFatigue(emotion: EmotionType, intensity: number): void {
    const fatigueRate = EMOTION_FATIGUE_RATES[emotion] || 0;
    this.overallFatigue += intensity * fatigueRate;

    if (emotion === 'neutral') {
      this.overallFatigue = Math.max(0, this.overallFatigue - 0.03);
    }

    this.overallFatigue = Math.max(0, Math.min(1, this.overallFatigue));
  }

  private updateConsecutiveHigh(emotion: EmotionType, intensity: number): void {
    if (emotion === 'neutral') {
      this.consecutiveHighCount = 0;
      return;
    }

    if (intensity > 0.6) {
      this.consecutiveHighCount += 1;
    } else {
      this.consecutiveHighCount = Math.max(0, this.consecutiveHighCount - 1);
    }
  }

  private updateDecompressionState(): void {
    if (this.decompressionActive) {
      this.decompressionCooldown -= 1;
      if (this.decompressionCooldown <= 0) {
        this.decompressionActive = false;
        this.overallFatigue *= 0.5;
        this.governor.publish('fatigue:decompression_ended', {
          overallFatigue: this.overallFatigue,
        }, 'EmotionalFatigueModel', 'normal');
      }
      return;
    }

    const fatigue = this.buildState();
    if (fatigue.needsDecompression) {
      this.decompressionActive = true;
      this.decompressionCooldown = FATIGUE_THRESHOLDS.decompressionCooldown;

      this.governor.publish('fatigue:decompression_needed', {
        level: fatigue.decompressionLevel,
        overallFatigue: fatigue.overallFatigue,
      }, 'EmotionalFatigueModel', 'normal');
    }
  }

  private buildState(): FatigueState {
    const tensionAcc = this.accumulators.get('anger');
    const sadnessAcc = this.accumulators.get('sadness');
    const fearAcc = this.accumulators.get('fear');

    const tensionFatigue = tensionAcc ? tensionAcc.totalIntensity : 0;
    const sadnessFatigue = sadnessAcc ? sadnessAcc.totalIntensity : 0;
    const fearFatigue = fearAcc ? fearAcc.totalIntensity : 0;

    const needsDecompression =
      this.overallFatigue > FATIGUE_THRESHOLDS.overall ||
      tensionFatigue > FATIGUE_THRESHOLDS.tension ||
      sadnessFatigue > FATIGUE_THRESHOLDS.sadness ||
      fearFatigue > FATIGUE_THRESHOLDS.fear ||
      this.consecutiveHighCount > FATIGUE_THRESHOLDS.consecutiveHighLimit;

    let decompressionLevel = 0;
    let recommendedPacing: FatigueState['recommendedPacing'] = 'normal';

    if (needsDecompression) {
      if (this.overallFatigue > 0.8 || this.consecutiveHighCount > 10) {
        decompressionLevel = 1.0;
        recommendedPacing = 'rest';
      } else if (this.overallFatigue > 0.7 || this.consecutiveHighCount > 8) {
        decompressionLevel = 0.7;
        recommendedPacing = 'gentle';
      } else {
        decompressionLevel = 0.4;
        recommendedPacing = 'gentle';
      }
    }

    return {
      overallFatigue: this.overallFatigue,
      tensionFatigue,
      sadnessFatigue,
      fearFatigue,
      needsDecompression,
      decompressionLevel,
      recommendedPacing,
    };
  }

  getDecompressionProfile(): typeof DECOMPRESSION_PROFILES.gentle | null {
    if (!this.decompressionActive) return null;

    const state = this.buildState();
    return state.recommendedPacing === 'rest'
      ? DECOMPRESSION_PROFILES.rest
      : DECOMPRESSION_PROFILES.gentle;
  }

  isDecompressing(): boolean {
    return this.decompressionActive;
  }

  getFatigueState(): FatigueState {
    return this.buildState();
  }

  subscribe(listener: (state: FatigueState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(state: FatigueState): void {
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (e) {
        console.error('[EmotionalFatigueModel] Listener error:', e);
      }
    }
  }

  reset(): void {
    this.overallFatigue = 0;
    this.consecutiveHighCount = 0;
    this.decompressionActive = false;
    this.decompressionCooldown = 0;
    this.initAccumulators();
  }

  destroy(): void {
    this.reset();
    this.listeners.clear();
  }
}
