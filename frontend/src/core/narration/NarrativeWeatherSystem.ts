import { EmotionType } from '../types';
import { NarrativeArc } from './NarrativeContextManager';
import { NarrativeFingerprint } from './NarrativeIdentityEngine';
import { EventGovernor } from '../events/EventGovernor';

export interface WeatherState {
  temperature: number;
  clarity: number;
  weight: number;
  drift: AtmosphericDrift;
  season: NarrativeSeason;
  timeOfDay: number;
}

export interface AtmosphericDrift {
  darknessAccumulation: number;
  warmthAccumulation: number;
  tensionAccumulation: number;
  stillnessAccumulation: number;
  driftSpeed: number;
  driftDirection: 'darkening' | 'brightening' | 'warming' | 'cooling' | 'stable';
}

export type NarrativeSeason =
  | 'spring'
  | 'summer'
  | 'autumn'
  | 'winter'
  | 'thaw'
  | 'storm'
  | 'stillness';

interface DriftSample {
  emotion: EmotionType;
  intensity: number;
  arcPosition: NarrativeArc['arcPosition'];
  timestamp: number;
}

const SEASON_TRAITS: Record<NarrativeSeason, {
  temperatureRange: [number, number];
  clarityRange: [number, number];
  weightRange: [number, number];
}> = {
  spring: { temperatureRange: [0.5, 0.7], clarityRange: [0.6, 0.8], weightRange: [0.3, 0.5] },
  summer: { temperatureRange: [0.7, 0.9], clarityRange: [0.7, 0.9], weightRange: [0.2, 0.4] },
  autumn: { temperatureRange: [0.4, 0.6], clarityRange: [0.5, 0.7], weightRange: [0.5, 0.7] },
  winter: { temperatureRange: [0.1, 0.3], clarityRange: [0.3, 0.5], weightRange: [0.7, 0.9] },
  thaw: { temperatureRange: [0.3, 0.5], clarityRange: [0.4, 0.6], weightRange: [0.4, 0.6] },
  storm: { temperatureRange: [0.2, 0.5], clarityRange: [0.2, 0.4], weightRange: [0.8, 1.0] },
  stillness: { temperatureRange: [0.4, 0.6], clarityRange: [0.8, 1.0], weightRange: [0.1, 0.3] },
};

const EMOTION_DRIFT_CONTRIBUTIONS: Record<EmotionType, {
  temperature: number;
  clarity: number;
  weight: number;
}> = {
  joy: { temperature: 0.05, clarity: 0.03, weight: -0.02 },
  sadness: { temperature: -0.04, clarity: -0.02, weight: 0.04 },
  anger: { temperature: 0.03, clarity: -0.04, weight: 0.03 },
  fear: { temperature: -0.05, clarity: -0.03, weight: 0.05 },
  surprise: { temperature: 0.01, clarity: 0.02, weight: 0.01 },
  neutral: { temperature: 0, clarity: 0.01, weight: 0 },
};

export class NarrativeWeatherSystem {
  private governor: EventGovernor;
  private currentWeather: WeatherState;
  private driftHistory: DriftSample[] = [];
  private sampleWindowSize = 30;
  private listeners: Set<(weather: WeatherState) => void> = new Set();

  constructor(governor: EventGovernor) {
    this.governor = governor;
    this.currentWeather = this.createInitialWeather();
  }

  private createInitialWeather(): WeatherState {
    return {
      temperature: 0.5,
      clarity: 0.6,
      weight: 0.3,
      drift: {
        darknessAccumulation: 0,
        warmthAccumulation: 0,
        tensionAccumulation: 0,
        stillnessAccumulation: 0,
        driftSpeed: 0,
        driftDirection: 'stable',
      },
      season: 'spring',
      timeOfDay: 0.5,
    };
  }

  processSentence(
    emotion: EmotionType,
    intensity: number,
    arcPosition: NarrativeArc['arcPosition']
  ): WeatherState {
    const sample: DriftSample = {
      emotion,
      intensity,
      arcPosition,
      timestamp: Date.now(),
    };

    this.driftHistory.push(sample);
    if (this.driftHistory.length > this.sampleWindowSize * 2) {
      this.driftHistory.shift();
    }

    this.updateDrift();
    this.updateSeason();
    this.updateTemperature();
    this.updateClarity();
    this.updateWeight();
    this.updateTimeOfDay();

    this.notifyListeners();
    return this.currentWeather;
  }

  private updateDrift(): void {
    const window = this.driftHistory.slice(-this.sampleWindowSize);
    if (window.length < 5) return;

    const drift = this.currentWeather.drift;

    let darknessDelta = 0;
    let warmthDelta = 0;
    let tensionDelta = 0;
    let stillnessDelta = 0;

    for (const sample of window) {
      const contributions = EMOTION_DRIFT_CONTRIBUTIONS[sample.emotion];
      darknessDelta += contributions.weight * sample.intensity;
      warmthDelta += contributions.temperature * sample.intensity;
      tensionDelta += sample.emotion === 'anger' || sample.emotion === 'fear'
        ? sample.intensity * 0.05
        : 0;
      stillnessDelta += sample.emotion === 'neutral'
        ? 0.02
        : 0;
    }

    const decay = 0.95;
    drift.darknessAccumulation = drift.darknessAccumulation * decay + darknessDelta * 0.1;
    drift.warmthAccumulation = drift.warmthAccumulation * decay + warmthDelta * 0.1;
    drift.tensionAccumulation = drift.tensionAccumulation * decay + tensionDelta * 0.1;
    drift.stillnessAccumulation = drift.stillnessAccumulation * decay + stillnessDelta * 0.1;

    drift.driftSpeed = Math.abs(drift.darknessAccumulation) + Math.abs(drift.warmthAccumulation);

    if (drift.darknessAccumulation > 0.1) {
      drift.driftDirection = 'darkening';
    } else if (drift.darknessAccumulation < -0.1) {
      drift.driftDirection = 'brightening';
    } else if (drift.warmthAccumulation > 0.1) {
      drift.driftDirection = 'warming';
    } else if (drift.warmthAccumulation < -0.1) {
      drift.driftDirection = 'cooling';
    } else {
      drift.driftDirection = 'stable';
    }
  }

  private updateSeason(): void {
    const drift = this.currentWeather.drift;
    const recent = this.driftHistory.slice(-10);

    const avgIntensity = recent.length > 0
      ? recent.reduce((s, r) => s + r.intensity, 0) / recent.length
      : 0.5;

    const tensionLevel = drift.tensionAccumulation;
    const stillnessLevel = drift.stillnessAccumulation;

    let newSeason: NarrativeSeason = 'spring';

    if (tensionLevel > 0.3) {
      newSeason = 'storm';
    } else if (stillnessLevel > 0.3) {
      newSeason = 'stillness';
    } else if (drift.darknessAccumulation > 0.2) {
      newSeason = 'winter';
    } else if (drift.darknessAccumulation < -0.2 && avgIntensity < 0.4) {
      newSeason = 'spring';
    } else if (drift.warmthAccumulation > 0.2) {
      newSeason = 'summer';
    } else if (drift.darknessAccumulation > 0.05) {
      newSeason = 'autumn';
    } else if (drift.darknessAccumulation < -0.1) {
      newSeason = 'thaw';
    }

    if (newSeason !== this.currentWeather.season) {
      this.currentWeather.season = newSeason;
      this.governor.publish('weather:season_changed', {
        season: newSeason,
      }, 'NarrativeWeatherSystem', 'normal');
    }
  }

  private updateTemperature(): void {
    const seasonTraits = SEASON_TRAITS[this.currentWeather.season];
    const drift = this.currentWeather.drift;

    const targetTemperature = (seasonTraits.temperatureRange[0] + seasonTraits.temperatureRange[1]) / 2;
    const driftEffect = drift.warmthAccumulation * 0.3;

    this.currentWeather.temperature = Math.max(0, Math.min(1,
      targetTemperature + driftEffect
    ));
  }

  private updateClarity(): void {
    const seasonTraits = SEASON_TRAITS[this.currentWeather.season];
    const drift = this.currentWeather.drift;

    const targetClarity = (seasonTraits.clarityRange[0] + seasonTraits.clarityRange[1]) / 2;
    const driftEffect = -drift.tensionAccumulation * 0.2;

    this.currentWeather.clarity = Math.max(0, Math.min(1,
      targetClarity + driftEffect
    ));
  }

  private updateWeight(): void {
    const seasonTraits = SEASON_TRAITS[this.currentWeather.season];
    const drift = this.currentWeather.drift;

    const targetWeight = (seasonTraits.weightRange[0] + seasonTraits.weightRange[1]) / 2;
    const driftEffect = drift.darknessAccumulation * 0.2;

    this.currentWeather.weight = Math.max(0, Math.min(1,
      targetWeight + driftEffect
    ));
  }

  private updateTimeOfDay(): void {
    const recent = this.driftHistory.slice(-20);
    if (recent.length === 0) return;

    const timeProgress = recent.length / this.sampleWindowSize;
    this.currentWeather.timeOfDay = Math.min(1,
      this.currentWeather.timeOfDay + timeProgress * 0.01
    );
  }

  getWeather(): WeatherState {
    return { ...this.currentWeather };
  }

  getTemperature(): number {
    return this.currentWeather.temperature;
  }

  getClarity(): number {
    return this.currentWeather.clarity;
  }

  getWeight(): number {
    return this.currentWeather.weight;
  }

  getSeason(): NarrativeSeason {
    return this.currentWeather.season;
  }

  getDriftDirection(): AtmosphericDrift['driftDirection'] {
    return this.currentWeather.drift.driftDirection;
  }

  applyFingerprint(fingerprint: NarrativeFingerprint): void {
    const es = fingerprint.emotionalSignature;
    const ap = fingerprint.atmosphericProfile;

    this.currentWeather.temperature = 0.5 + es.warmthIndex * 0.3 - es.melancholyIndex * 0.2;
    this.currentWeather.clarity = 0.6 + ap.atmosphericConsistency * 0.3;
    this.currentWeather.weight = 0.3 + es.tensionIndex * 0.4 + es.melancholyIndex * 0.2;

    this.currentWeather.drift.darknessAccumulation = ap.darknessIndex * 0.5;
    this.currentWeather.drift.warmthAccumulation = ap.warmthIndex * 0.5;

    this.notifyListeners();
  }

  subscribe(listener: (weather: WeatherState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const weather = this.getWeather();
    for (const listener of this.listeners) {
      try {
        listener(weather);
      } catch (e) {
        console.error('[NarrativeWeatherSystem] Listener error:', e);
      }
    }
  }

  reset(): void {
    this.currentWeather = this.createInitialWeather();
    this.driftHistory = [];
  }

  destroy(): void {
    this.reset();
    this.listeners.clear();
  }
}
