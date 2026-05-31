import { EventGovernor } from '../events/EventGovernor';

export interface MidnightState {
  active: boolean;
  timeOfDay: 'day' | 'evening' | 'night' | 'deep_night';
  protectionLevel: number;
  warmthIncrease: number;
  pacingSoftening: number;
  ambientSoftening: number;
  brightnessReduction: number;
  silencePreference: number;
}

interface MidnightConfig {
  eveningStart: number;
  nightStart: number;
  deepNightStart: number;
  morningStart: number;
}

const DEFAULT_CONFIG: MidnightConfig = {
  eveningStart: 18,
  nightStart: 21,
  deepNightStart: 23,
  morningStart: 6,
};

const TIME_PROFILES: Record<MidnightState['timeOfDay'], Partial<MidnightState>> = {
  day: {
    protectionLevel: 0,
    warmthIncrease: 0,
    pacingSoftening: 0,
    ambientSoftening: 0,
    brightnessReduction: 0,
    silencePreference: 0,
  },
  evening: {
    protectionLevel: 0.2,
    warmthIncrease: 0.1,
    pacingSoftening: 0.05,
    ambientSoftening: 0.05,
    brightnessReduction: 0.1,
    silencePreference: 0.1,
  },
  night: {
    protectionLevel: 0.5,
    warmthIncrease: 0.2,
    pacingSoftening: 0.15,
    ambientSoftening: 0.15,
    brightnessReduction: 0.25,
    silencePreference: 0.2,
  },
  deep_night: {
    protectionLevel: 0.8,
    warmthIncrease: 0.3,
    pacingSoftening: 0.25,
    ambientSoftening: 0.25,
    brightnessReduction: 0.4,
    silencePreference: 0.35,
  },
};

export class MidnightModeManager {
  private governor: EventGovernor;
  private config: MidnightConfig;
  private currentState: MidnightState;
  private manualOverride = false;
  private listeners: Set<(state: MidnightState) => void> = new Set();

  constructor(governor: EventGovernor, config?: Partial<MidnightConfig>) {
    this.governor = governor;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentState = this.computeState();
  }

  private computeState(): MidnightState {
    const hour = new Date().getHours();
    const timeOfDay = this.getTimeOfDay(hour);
    const profile = TIME_PROFILES[timeOfDay];

    return {
      active: timeOfDay !== 'day',
      timeOfDay,
      protectionLevel: profile.protectionLevel || 0,
      warmthIncrease: profile.warmthIncrease || 0,
      pacingSoftening: profile.pacingSoftening || 0,
      ambientSoftening: profile.ambientSoftening || 0,
      brightnessReduction: profile.brightnessReduction || 0,
      silencePreference: profile.silencePreference || 0,
    };
  }

  private getTimeOfDay(hour: number): MidnightState['timeOfDay'] {
    if (hour >= this.config.morningStart && hour < this.config.eveningStart) {
      return 'day';
    }
    if (hour >= this.config.eveningStart && hour < this.config.nightStart) {
      return 'evening';
    }
    if (hour >= this.config.nightStart && hour < this.config.deepNightStart) {
      return 'night';
    }
    return 'deep_night';
  }

  refresh(): MidnightState {
    if (!this.manualOverride) {
      this.currentState = this.computeState();
      this.notifyListeners();
    }
    return { ...this.currentState };
  }

  getState(): MidnightState {
    return { ...this.currentState };
  }

  isActive(): boolean {
    return this.currentState.active;
  }

  isDeepNight(): boolean {
    return this.currentState.timeOfDay === 'deep_night';
  }

  getProtectionLevel(): number {
    return this.currentState.protectionLevel;
  }

  getWarmthIncrease(): number {
    return this.currentState.warmthIncrease;
  }

  getPacingSoftening(): number {
    return this.currentState.pacingSoftening;
  }

  getAmbientSoftening(): number {
    return this.currentState.ambientSoftening;
  }

  getBrightnessReduction(): number {
    return this.currentState.brightnessReduction;
  }

  getSilencePreference(): number {
    return this.currentState.silencePreference;
  }

  applyToPacing(basePacing: number): number {
    return basePacing * (1 - this.currentState.pacingSoftening);
  }

  applyToAmbient(baseAmbient: number): number {
    return baseAmbient * (1 - this.currentState.ambientSoftening);
  }

  applyToBrightness(baseBrightness: number): number {
    return baseBrightness * (1 - this.currentState.brightnessReduction);
  }

  applyToWarmth(baseWarmth: number): number {
    return Math.min(1.0, baseWarmth + this.currentState.warmthIncrease);
  }

  forceActive(): void {
    this.manualOverride = true;
    this.currentState.active = true;
    this.currentState.timeOfDay = 'deep_night';
    this.currentState.protectionLevel = 0.8;
    this.currentState.warmthIncrease = 0.3;
    this.currentState.pacingSoftening = 0.25;
    this.currentState.ambientSoftening = 0.25;
    this.currentState.brightnessReduction = 0.4;
    this.currentState.silencePreference = 0.35;

    this.governor.publish('midnight:force_activated', {}, 'MidnightModeManager', 'normal');
    this.notifyListeners();
  }

  forceDeactivate(): void {
    this.manualOverride = false;
    this.currentState = this.computeState();

    this.governor.publish('midnight:force_deactivated', {}, 'MidnightModeManager', 'normal');
    this.notifyListeners();
  }

  getTimeGreeting(): string {
    switch (this.currentState.timeOfDay) {
      case 'evening':
        return 'The evening settles gently.';
      case 'night':
        return 'The night holds its breath.';
      case 'deep_night':
        return 'The world is quiet now.';
      default:
        return '';
    }
  }

  subscribe(listener: (state: MidnightState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const state = { ...this.currentState };
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (e) {
        console.error('[MidnightModeManager] Listener error:', e);
      }
    }
  }

  reset(): void {
    this.manualOverride = false;
    this.currentState = this.computeState();
  }

  destroy(): void {
    this.reset();
    this.listeners.clear();
  }
}
