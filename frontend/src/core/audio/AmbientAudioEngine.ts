import { EventGovernor } from '../events/EventGovernor';
import { EmotionType } from '../types';
import { NarrativeArc } from '../narration/NarrativeContextManager';

export type AmbientSoundType =
  | 'rain_distant'
  | 'rain_window'
  | 'wind_low'
  | 'wind_gentle'
  | 'fire_crackle'
  | 'fire_calm'
  | 'tavern_murmur'
  | 'silence'
  | 'night_crickets'
  | 'forest_breeze';

export interface AmbientLayer {
  id: string;
  sound: AmbientSoundType;
  volume: number;
  fadeMs: number;
  active: boolean;
}

export interface AmbientPreset {
  name: string;
  layers: Array<{
    sound: AmbientSoundType;
    volume: number;
    fadeMs: number;
  }>;
  masterVolume: number;
}

interface ActiveLayerState {
  layer: AmbientLayer;
  currentVolume: number;
  targetVolume: number;
  fading: boolean;
  fadeStart: number;
  fadeDuration: number;
}

const EMOTION_PRESETS: Record<EmotionType, AmbientPreset> = {
  joy: {
    name: 'warm',
    layers: [
      { sound: 'fire_calm', volume: 0.15, fadeMs: 2000 },
      { sound: 'wind_gentle', volume: 0.08, fadeMs: 3000 },
    ],
    masterVolume: 0.2,
  },
  sadness: {
    name: 'rain',
    layers: [
      { sound: 'rain_distant', volume: 0.18, fadeMs: 3000 },
      { sound: 'wind_low', volume: 0.06, fadeMs: 4000 },
    ],
    masterVolume: 0.18,
  },
  anger: {
    name: 'tension',
    layers: [
      { sound: 'wind_low', volume: 0.12, fadeMs: 1500 },
    ],
    masterVolume: 0.12,
  },
  fear: {
    name: 'unease',
    layers: [
      { sound: 'wind_low', volume: 0.1, fadeMs: 2500 },
      { sound: 'silence', volume: 0.02, fadeMs: 5000 },
    ],
    masterVolume: 0.1,
  },
  surprise: {
    name: 'stillness',
    layers: [
      { sound: 'silence', volume: 0.03, fadeMs: 1000 },
    ],
    masterVolume: 0.03,
  },
  neutral: {
    name: 'quiet',
    layers: [],
    masterVolume: 0,
  },
};

const ARC_PRESETS: Record<NarrativeArc['arcPosition'], Partial<AmbientPreset>> = {
  beginning: { masterVolume: 1.0 },
  rising: { masterVolume: 1.1 },
  peak: { masterVolume: 1.2 },
  falling: { masterVolume: 0.9 },
  resolution: { masterVolume: 0.7 },
};

const TIME_PRESETS: Record<string, Partial<AmbientPreset>> = {
  night: {
    layers: [{ sound: 'night_crickets', volume: 0.05, fadeMs: 4000 }],
  },
  dawn: {
    layers: [{ sound: 'forest_breeze', volume: 0.04, fadeMs: 5000 }],
  },
};

export class AmbientAudioEngine {
  private layers: Map<string, ActiveLayerState> = new Map();
  private governor: EventGovernor;
  private enabled = false;
  private masterVolume = 0;
  private currentPreset: AmbientPreset | null = null;
  private narrationActive = false;
  private listeners: Set<(state: AmbientLayer[]) => void> = new Set();

  constructor(governor: EventGovernor) {
    this.governor = governor;
  }

  enable(): void {
    this.enabled = true;
    this.governor.publish('ambient:enabled', {}, 'AmbientAudioEngine', 'normal');
  }

  disable(): void {
    this.enabled = false;
    this.fadeOutAll(1000);
    this.governor.publish('ambient:disabled', {}, 'AmbientAudioEngine', 'normal');
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  applyEmotion(
    emotion: EmotionType,
    arc?: NarrativeArc | null
  ): void {
    if (!this.enabled) return;

    const basePreset = EMOTION_PRESETS[emotion] || EMOTION_PRESETS.neutral;
    const arcMod = arc ? ARC_PRESETS[arc.arcPosition] : ARC_PRESETS.beginning;
    const timePreset = this.getTimePreset();

    const mergedPreset = this.mergePresets(basePreset, arcMod, timePreset);
    this.applyPreset(mergedPreset);
  }

  private getTimePreset(): Partial<AmbientPreset> | null {
    const hour = new Date().getHours();
    if (hour >= 20 || hour < 6) return TIME_PRESETS.night;
    if (hour >= 6 && hour < 8) return TIME_PRESETS.dawn;
    return null;
  }

  private mergePresets(
    base: AmbientPreset,
    arcMod: Partial<AmbientPreset>,
    timeMod: Partial<AmbientPreset> | null
  ): AmbientPreset {
    const layers = [...base.layers];

    if (timeMod?.layers) {
      for (const timeLayer of timeMod.layers) {
        const existing = layers.find((l) => l.sound === timeLayer.sound);
        if (existing) {
          existing.volume = Math.min(0.1, existing.volume + timeLayer.volume);
        } else {
          layers.push(timeLayer);
        }
      }
    }

    return {
      name: `${base.name}_${arcMod.masterVolume || 1}`,
      layers,
      masterVolume: base.masterVolume * (arcMod.masterVolume || 1),
    };
  }

  private applyPreset(preset: AmbientPreset): void {
    this.currentPreset = preset;
    this.masterVolume = preset.masterVolume;

    const activeSoundIds = new Set(preset.layers.map((l) => l.sound));

    for (const [id, state] of this.layers) {
      if (!activeSoundIds.has(state.layer.sound as AmbientSoundType)) {
        this.fadeOutLayer(id, 1000);
      }
    }

    for (const layerConfig of preset.layers) {
      const id = `ambient_${layerConfig.sound}`;
      const existing = this.layers.get(id);

      if (existing) {
        existing.targetVolume = layerConfig.volume * this.masterVolume;
        this.fadeLayer(existing, existing.targetVolume, layerConfig.fadeMs);
      } else {
        const layer: AmbientLayer = {
          id,
          sound: layerConfig.sound,
          volume: layerConfig.volume,
          fadeMs: layerConfig.fadeMs,
          active: true,
        };

        const state: ActiveLayerState = {
          layer,
          currentVolume: 0,
          targetVolume: layerConfig.volume * this.masterVolume,
          fading: false,
          fadeStart: 0,
          fadeDuration: layerConfig.fadeMs,
        };

        this.layers.set(id, state);
        this.fadeLayer(state, state.targetVolume, layerConfig.fadeMs);
      }
    }

    this.notifyListeners();
    this.governor.publish('ambient:preset_applied', {
      preset: preset.name,
      layerCount: preset.layers.length,
      masterVolume: preset.masterVolume,
    }, 'AmbientAudioEngine', 'low');
  }

  onNarrationStart(): void {
    this.narrationActive = true;
    this.duckForNarration();
  }

  onNarrationPause(): void {
    this.narrationActive = false;
    this.unduckForNarration();
  }

  private duckForNarration(): void {
    for (const state of this.layers.values()) {
      if (state.layer.active) {
        const duckedVolume = state.targetVolume * 0.4;
        this.fadeLayer(state, duckedVolume, 200);
      }
    }
  }

  private unduckForNarration(): void {
    if (!this.currentPreset) return;

    for (const state of this.layers.values()) {
      if (state.layer.active) {
        const originalVolume = state.layer.volume * this.masterVolume;
        this.fadeLayer(state, originalVolume, 300);
      }
    }
  }

  private fadeLayer(
    state: ActiveLayerState,
    targetVolume: number,
    durationMs: number
  ): void {
    state.fading = true;
    state.fadeStart = Date.now();
    state.fadeDuration = durationMs;
    state.targetVolume = targetVolume;

    const tick = () => {
      if (!state.fading) return;

      const elapsed = Date.now() - state.fadeStart;
      const progress = Math.min(elapsed / state.fadeDuration, 1.0);

      state.currentVolume = state.currentVolume + (state.targetVolume - state.currentVolume) * progress;

      if (progress >= 1.0) {
        state.currentVolume = state.targetVolume;
        state.fading = false;

        if (state.currentVolume < 0.001) {
          state.layer.active = false;
        }
      } else {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }

  private fadeOutLayer(id: string, durationMs: number): void {
    const state = this.layers.get(id);
    if (state) {
      this.fadeLayer(state, 0, durationMs);
    }
  }

  private fadeOutAll(durationMs: number): void {
    for (const state of this.layers.values()) {
      this.fadeLayer(state, 0, durationMs);
    }
  }

  getLayerVolume(id: string): number {
    const state = this.layers.get(id);
    return state ? state.currentVolume : 0;
  }

  getActiveLayers(): AmbientLayer[] {
    return Array.from(this.layers.values())
      .filter((s) => s.layer.active)
      .map((s) => s.layer);
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1.0, volume));

    if (this.currentPreset) {
      for (const state of this.layers.values()) {
        if (state.layer.active) {
          const newVolume = state.layer.volume * this.masterVolume;
          this.fadeLayer(state, newVolume, 200);
        }
      }
    }
  }

  subscribe(listener: (state: AmbientLayer[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const active = this.getActiveLayers();
    for (const listener of this.listeners) {
      try {
        listener(active);
      } catch (e) {
        console.error('[AmbientAudioEngine] Listener error:', e);
      }
    }
  }

  reset(): void {
    this.layers.clear();
    this.currentPreset = null;
    this.masterVolume = 0;
    this.narrationActive = false;
  }

  destroy(): void {
    this.reset();
    this.listeners.clear();
  }
}
