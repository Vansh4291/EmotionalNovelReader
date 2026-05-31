import { EmotionType } from '../types';
import { NarrativeFingerprint } from './NarrativeIdentityEngine';
import { NarrativeArc } from './NarrativeContextManager';
import { EventGovernor } from '../events/EventGovernor';

export interface GravityState {
  weight: number;
  density: number;
  temperature: number;
  airiness: number;
  depth: number;
  gravityModifier: GravityModifier;
}

export interface GravityModifier {
  transitionSpeed: number;
  ambientReduction: number;
  spacingExpansion: number;
  silenceExtension: number;
  motionDamping: number;
}

export type StoryWeight = 'airy' | 'light' | 'moderate' | 'heavy' | 'dense';

const WEIGHT_THRESHOLDS: Array<{
  weight: StoryWeight;
  minDensity: number;
  maxDensity: number;
}> = [
  { weight: 'airy', minDensity: 0, maxDensity: 0.2 },
  { weight: 'light', minDensity: 0.2, maxDensity: 0.4 },
  { weight: 'moderate', minDensity: 0.4, maxDensity: 0.6 },
  { weight: 'heavy', minDensity: 0.6, maxDensity: 0.8 },
  { weight: 'dense', minDensity: 0.8, maxDensity: 1.0 },
];

const EMOTION_GRAVITY: Record<EmotionType, {
  weight: number;
  temperature: number;
}> = {
  joy: { weight: 0.3, temperature: 0.7 },
  sadness: { weight: 0.7, temperature: 0.3 },
  anger: { weight: 0.6, temperature: 0.6 },
  fear: { weight: 0.65, temperature: 0.2 },
  surprise: { weight: 0.4, temperature: 0.5 },
  neutral: { weight: 0.4, temperature: 0.5 },
};

export class EmotionalGravitySystem {
  private governor: EventGovernor;
  private currentState: GravityState;
  private gravityHistory: Array<{
    weight: number;
    timestamp: number;
  }> = [];
  private listeners: Set<(state: GravityState) => void> = new Set();

  constructor(governor: EventGovernor) {
    this.governor = governor;
    this.currentState = this.createDefaultState();
  }

  private createDefaultState(): GravityState {
    return {
      weight: 0.4,
      density: 0.4,
      temperature: 0.5,
      airiness: 0.6,
      depth: 0.3,
      gravityModifier: {
        transitionSpeed: 1.0,
        ambientReduction: 0,
        spacingExpansion: 0,
        silenceExtension: 0,
        motionDamping: 0,
      },
    };
  }

  processSentence(
    emotion: EmotionType,
    intensity: number,
    arc: NarrativeArc
  ): GravityState {
    const emotionGravity = EMOTION_GRAVITY[emotion];

    const weightDelta = (emotionGravity.weight - 0.4) * intensity * 0.1;
    const temperatureDelta = (emotionGravity.temperature - 0.5) * intensity * 0.1;

    this.currentState.weight = Math.max(0, Math.min(1,
      this.currentState.weight + weightDelta
    ));

    this.currentState.temperature = Math.max(0, Math.min(1,
      this.currentState.temperature + temperatureDelta
    ));

    this.currentState.density = this.computeDensity(arc);
    this.currentState.airiness = 1 - this.currentState.density;
    this.currentState.depth = this.computeDepth(arc);

    this.currentState.gravityModifier = this.computeModifier();

    this.gravityHistory.push({
      weight: this.currentState.weight,
      timestamp: Date.now(),
    });

    if (this.gravityHistory.length > 100) {
      this.gravityHistory.shift();
    }

    this.notifyListeners();
    return { ...this.currentState };
  }

  private computeDensity(arc: NarrativeArc): number {
    const tensionDensity = arc.currentTension * 0.4;
    const pacingDensity = (1 - arc.currentPacing) * 0.3;
    const momentumDensity = Math.abs(arc.emotionalMomentum) * 0.3;

    return Math.max(0, Math.min(1,
      tensionDensity + pacingDensity + momentumDensity
    ));
  }

  private computeDepth(arc: NarrativeArc): number {
    const tensionDepth = arc.currentTension * 0.5;
    const dialogueDepth = arc.dialogueActive ? 0.2 : 0;
    const sceneDepth = arc.sceneIndex > 0 ? 0.1 : 0;

    return Math.max(0, Math.min(1,
      tensionDepth + dialogueDepth + sceneDepth
    ));
  }

  private computeModifier(): GravityModifier {
    const weight = this.currentState.weight;
    const density = this.currentState.density;

    return {
      transitionSpeed: 1.0 - weight * 0.4,
      ambientReduction: density * 0.3,
      spacingExpansion: weight * 0.2,
      silenceExtension: density * 0.25,
      motionDamping: weight * 0.3,
    };
  }

  getStoryWeight(): StoryWeight {
    for (const threshold of WEIGHT_THRESHOLDS) {
      if (this.currentState.density >= threshold.minDensity &&
          this.currentState.density < threshold.maxDensity) {
        return threshold.weight;
      }
    }
    return 'moderate';
  }

  getGravityState(): GravityState {
    return { ...this.currentState };
  }

  getModifier(): GravityModifier {
    return { ...this.currentState.gravityModifier };
  }

  applyFingerprint(fingerprint: NarrativeFingerprint): void {
    const es = fingerprint.emotionalSignature;

    this.currentState.weight = 0.3 + es.tensionIndex * 0.3 + es.melancholyIndex * 0.2;
    this.currentState.temperature = 0.5 + es.warmthIndex * 0.3 - es.melancholyIndex * 0.2;
    this.currentState.density = es.tensionIndex * 0.5 + es.volatility * 0.2;
    this.currentState.airiness = 1 - this.currentState.density;

    this.currentState.gravityModifier = this.computeModifier();
    this.notifyListeners();
  }

  isHeavy(): boolean {
    return this.currentState.weight > 0.6;
  }

  isLight(): boolean {
    return this.currentState.weight < 0.3;
  }

  getTemperatureDescription(): string {
    const temp = this.currentState.temperature;
    if (temp < 0.3) return 'cold';
    if (temp < 0.5) return 'cool';
    if (temp < 0.7) return 'warm';
    return 'hot';
  }

  subscribe(listener: (state: GravityState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const state = { ...this.currentState };
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (e) {
        console.error('[EmotionalGravitySystem] Listener error:', e);
      }
    }
  }

  reset(): void {
    this.currentState = this.createDefaultState();
    this.gravityHistory = [];
  }

  destroy(): void {
    this.reset();
    this.listeners.clear();
  }
}
