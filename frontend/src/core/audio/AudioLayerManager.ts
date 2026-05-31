import { EventGovernor } from '../events/EventGovernor';

export type AudioLayerType = 'narration' | 'ambience' | 'music' | 'effect';

export interface AudioLayer {
  id: string;
  type: AudioLayerType;
  volume: number;
  muted: boolean;
  active: boolean;
  priority: number;
  fadeMs: number;
}

export interface DuckingConfig {
  triggerLayer: AudioLayerType;
  targetLayer: AudioLayerType;
  duckVolume: number;
  fadeMs: number;
}

export interface CrossfadeConfig {
  fromLayerId: string;
  toLayerId: string;
  durationMs: number;
}

interface ActiveLayerState {
  layer: AudioLayer;
  currentVolume: number;
  targetVolume: number;
  fading: boolean;
  fadeStart: number;
  fadeDuration: number;
}

const LAYER_PRIORITIES: Record<AudioLayerType, number> = {
  narration: 100,
  effect: 80,
  ambience: 40,
  music: 30,
};

const DEFAULT_DUCKING: DuckingConfig[] = [
  { triggerLayer: 'narration', targetLayer: 'ambience', duckVolume: 0.25, fadeMs: 200 },
  { triggerLayer: 'narration', targetLayer: 'music', duckVolume: 0.35, fadeMs: 300 },
  { triggerLayer: 'effect', targetLayer: 'ambience', duckVolume: 0.5, fadeMs: 150 },
];

export class AudioLayerManager {
  private layers: Map<string, ActiveLayerState> = new Map();
  private duckingConfigs: DuckingConfig[];
  private governor: EventGovernor;
  private globalVolume = 1.0;
  private narrationActive = false;
  private fadeFrameId: number | null = null;

  constructor(governor: EventGovernor) {
    this.governor = governor;
    this.duckingConfigs = [...DEFAULT_DUCKING];
  }

  createLayer(
    id: string,
    type: AudioLayerType,
    options: Partial<Pick<AudioLayer, 'volume' | 'priority' | 'fadeMs'>> = {}
  ): AudioLayer {
    const layer: AudioLayer = {
      id,
      type,
      volume: options.volume ?? 1.0,
      muted: false,
      active: false,
      priority: options.priority ?? LAYER_PRIORITIES[type],
      fadeMs: options.fadeMs ?? 300,
    };

    this.layers.set(id, {
      layer,
      currentVolume: 0,
      targetVolume: 0,
      fading: false,
      fadeStart: 0,
      fadeDuration: 0,
    });

    return layer;
  }

  removeLayer(id: string): void {
    this.layers.delete(id);
  }

  async activateLayer(id: string, targetVolume?: number): Promise<void> {
    const state = this.layers.get(id);
    if (!state) return;

    state.layer.active = true;
    state.targetVolume = targetVolume ?? state.layer.volume;

    this.applyDucking(id);
    await this.startFade(state, state.targetVolume);

    this.governor.publish('audio:layer_activated', {
      layerId: id,
      type: state.layer.type,
      volume: state.targetVolume,
    }, 'AudioLayerManager', 'normal');
  }

  async deactivateLayer(id: string): Promise<void> {
    const state = this.layers.get(id);
    if (!state) return;

    state.targetVolume = 0;
    await this.startFade(state, 0);
    state.layer.active = false;

    this.releaseDucking(id);

    this.governor.publish('audio:layer_deactivated', {
      layerId: id,
      type: state.layer.type,
    }, 'AudioLayerManager', 'normal');
  }

  async setLayerVolume(id: string, volume: number): Promise<void> {
    const state = this.layers.get(id);
    if (!state) return;

    state.layer.volume = Math.max(0, Math.min(1.0, volume));
    if (state.layer.active && !state.layer.muted) {
      state.targetVolume = state.layer.volume;
      await this.startFade(state, state.targetVolume);
    }
  }

  async muteLayer(id: string): Promise<void> {
    const state = this.layers.get(id);
    if (!state) return;

    state.layer.muted = true;
    state.targetVolume = 0;
    await this.startFade(state, 0);
  }

  async unmuteLayer(id: string): Promise<void> {
    const state = this.layers.get(id);
    if (!state) return;

    state.layer.muted = false;
    state.targetVolume = state.layer.volume;
    await this.startFade(state, state.targetVolume);
  }

  setGlobalVolume(volume: number): void {
    this.globalVolume = Math.max(0, Math.min(1.0, volume));
    for (const state of this.layers.values()) {
      if (state.layer.active) {
        state.targetVolume = state.layer.volume * this.globalVolume;
      }
    }
  }

  async crossfade(config: CrossfadeConfig): Promise<void> {
    const fromState = this.layers.get(config.fromLayerId);
    const toState = this.layers.get(config.toLayerId);
    if (!fromState || !toState) return;

    const fromPromise = this.startFade(fromState, 0, config.durationMs);
    toState.layer.active = true;
    const toPromise = this.startFade(
      toState,
      toState.layer.volume * this.globalVolume,
      config.durationMs
    );

    await Promise.all([fromPromise, toPromise]);
    fromState.layer.active = false;
  }

  onNarrationStart(): void {
    this.narrationActive = true;
    this.applyDuckingForNarration(true);
  }

  onNarrationPause(): void {
    this.narrationActive = false;
    this.releaseDuckingForNarration();
  }

  private applyDucking(activatedLayerId: string): void {
    const activatedState = this.layers.get(activatedLayerId);
    if (!activatedState) return;

    for (const config of this.duckingConfigs) {
      if (activatedState.layer.type === config.triggerLayer) {
        for (const [id, state] of this.layers) {
          if (id === activatedLayerId) continue;
          if (state.layer.type === config.targetLayer && state.layer.active) {
            state.targetVolume = state.layer.volume * config.duckVolume;
            this.startFade(state, state.targetVolume, config.fadeMs);
          }
        }
      }
    }
  }

  private releaseDucking(deactivatedLayerId: string): void {
    const deactivatedState = this.layers.get(deactivatedLayerId);
    if (!deactivatedState) return;

    for (const config of this.duckingConfigs) {
      if (deactivatedState.layer.type === config.triggerLayer) {
        for (const [id, state] of this.layers) {
          if (id === deactivatedLayerId) continue;
          if (state.layer.type === config.targetLayer && state.layer.active) {
            state.targetVolume = state.layer.volume;
            this.startFade(state, state.targetVolume, config.fadeMs);
          }
        }
      }
    }
  }

  private applyDuckingForNarration(narrationActive: boolean): void {
    if (!narrationActive) return;

    for (const config of this.duckingConfigs) {
      if (config.triggerLayer === 'narration') {
        for (const [, state] of this.layers) {
          if (state.layer.type === config.targetLayer && state.layer.active) {
            state.targetVolume = state.layer.volume * config.duckVolume;
            this.startFade(state, state.targetVolume, config.fadeMs);
          }
        }
      }
    }
  }

  private releaseDuckingForNarration(): void {
    for (const config of this.duckingConfigs) {
      if (config.triggerLayer === 'narration') {
        for (const [, state] of this.layers) {
          if (state.layer.type === config.targetLayer && state.layer.active) {
            state.targetVolume = state.layer.volume;
            this.startFade(state, state.targetVolume, config.fadeMs);
          }
        }
      }
    }
  }

  private startFade(
    state: ActiveLayerState,
    targetVolume: number,
    durationMs?: number
  ): Promise<void> {
    return new Promise((resolve) => {
      const duration = durationMs ?? state.layer.fadeMs;
      state.fading = true;
      state.fadeStart = Date.now();
      state.fadeDuration = duration;
      state.targetVolume = targetVolume;

      const tick = () => {
        if (!state.fading) {
          resolve();
          return;
        }

        const elapsed = Date.now() - state.fadeStart;
        const progress = Math.min(elapsed / state.fadeDuration, 1.0);

        const startVol = state.currentVolume;
        state.currentVolume = startVol + (state.targetVolume - startVol) * progress;

        if (progress >= 1.0) {
          state.currentVolume = state.targetVolume;
          state.fading = false;
          resolve();
        } else {
          requestAnimationFrame(tick);
        }
      };

      requestAnimationFrame(tick);
    });
  }

  getLayerVolume(id: string): number {
    const state = this.layers.get(id);
    return state ? state.currentVolume : 0;
  }

  getLayer(id: string): AudioLayer | undefined {
    return this.layers.get(id)?.layer;
  }

  getActiveLayers(): AudioLayer[] {
    return Array.from(this.layers.values())
      .filter((s) => s.layer.active)
      .map((s) => s.layer);
  }

  getMasterVolume(): number {
    return this.globalVolume;
  }

  setDuckingConfigs(configs: DuckingConfig[]): void {
    this.duckingConfigs = configs;
  }

  destroy(): void {
    this.layers.clear();
    if (this.fadeFrameId !== null) {
      cancelAnimationFrame(this.fadeFrameId);
    }
  }
}
