import { EmotionType } from '../types';
import { NarrativeFingerprint } from './NarrativeIdentityEngine';
import { EventGovernor } from '../events/EventGovernor';

export interface LastPageState {
  active: boolean;
  phase: 'narration_end' | 'ambient_fade' | 'silence' | 'memory' | 'departure';
  progress: number;
  finalMessage: string | null;
  fadeDuration: number;
  silenceDuration: number;
}

interface LastPageConfig {
  narrationFadeDuration: number;
  ambientFadeDuration: number;
  silenceDuration: number;
  memoryDuration: number;
  departureFadeDuration: number;
}

const DEFAULT_CONFIG: LastPageConfig = {
  narrationFadeDuration: 2000,
  ambientFadeDuration: 3000,
  silenceDuration: 4000,
  memoryDuration: 5000,
  departureFadeDuration: 3000,
};

const ENDING_MESSAGES: Record<EmotionType, string[]> = {
  joy: [
    'The light lingers here.',
    'A warm moment was felt.',
    'Something bright remains.',
  ],
  sadness: [
    'The weight rests gently.',
    'A quiet sorrow breathes.',
    'The stillness holds.',
  ],
  anger: [
    'The fire settles to embers.',
    'Heat softens slowly.',
    'Something smolders quietly.',
  ],
  fear: [
    'The shadows rest.',
    'The dark is patient.',
    'Something stirs softly.',
  ],
  surprise: [
    'The world holds its breath.',
    'An echo of wonder.',
    'Something shifted.',
  ],
  neutral: [
    'The story breathes.',
    'A quiet moment.',
    'Stillness settles.',
  ],
};

export class LastPageExperience {
  private governor: EventGovernor;
  private config: LastPageConfig;
  private currentState: LastPageState;
  private phaseTimers: NodeJS.Timeout[] = [];
  private listeners: Set<(state: LastPageState) => void> = new Set();

  constructor(governor: EventGovernor, config?: Partial<LastPageConfig>) {
    this.governor = governor;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentState = this.createInactiveState();
  }

  private createInactiveState(): LastPageState {
    return {
      active: false,
      phase: 'narration_end',
      progress: 0,
      finalMessage: null,
      fadeDuration: 0,
      silenceDuration: 0,
    };
  }

  begin(
    finalEmotion: EmotionType,
    fingerprint: NarrativeFingerprint
  ): void {
    this.clearTimers();

    const message = this.selectMessage(finalEmotion, fingerprint);

    this.currentState = {
      active: true,
      phase: 'narration_end',
      progress: 0,
      finalMessage: message,
      fadeDuration: this.config.narrationFadeDuration,
      silenceDuration: this.config.silenceDuration,
    };

    this.notifyListeners();
    this.governor.publish('lastpage:started', {
      emotion: finalEmotion,
      message,
    }, 'LastPageExperience', 'normal');

    this.schedulePhases();
  }

  private selectMessage(
    emotion: EmotionType,
    fingerprint: NarrativeFingerprint
  ): string {
    const messages = ENDING_MESSAGES[emotion] || ENDING_MESSAGES.neutral;

    const es = fingerprint.emotionalSignature;

    if (es.melancholyIndex > 0.5) {
      return 'The weight rests here.';
    }

    if (es.warmthIndex > 0.5) {
      return 'A warm moment remains.';
    }

    if (es.tensionIndex > 0.5) {
      return 'The tension softens.';
    }

    return messages[Math.floor(Date.now() / 100000) % messages.length];
  }

  private schedulePhases(): void {
    const phases: Array<{
      phase: LastPageState['phase'];
      duration: number;
    }> = [
      { phase: 'narration_end', duration: this.config.narrationFadeDuration },
      { phase: 'ambient_fade', duration: this.config.ambientFadeDuration },
      { phase: 'silence', duration: this.config.silenceDuration },
      { phase: 'memory', duration: this.config.memoryDuration },
      { phase: 'departure', duration: this.config.departureFadeDuration },
    ];

    let cumulativeDelay = 0;

    for (let i = 0; i < phases.length; i++) {
      const { phase, duration } = phases[i];

      const timer = setTimeout(() => {
        this.currentState.phase = phase;
        this.currentState.progress = i / (phases.length - 1);
        this.notifyListeners();

        this.governor.publish('lastpage:phase_changed', {
          phase,
          progress: this.currentState.progress,
        }, 'LastPageExperience', 'low');
      }, cumulativeDelay);

      this.phaseTimers.push(timer);
      cumulativeDelay += duration;
    }

    const completionTimer = setTimeout(() => {
      this.complete();
    }, cumulativeDelay);

    this.phaseTimers.push(completionTimer);
  }

  private complete(): void {
    this.currentState.progress = 1;
    this.currentState.active = false;

    this.notifyListeners();
    this.governor.publish('lastpage:completed', {}, 'LastPageExperience', 'normal');
  }

  getState(): LastPageState {
    return { ...this.currentState };
  }

  isActive(): boolean {
    return this.currentState.active;
  }

  getPhase(): LastPageState['phase'] {
    return this.currentState.phase;
  }

  getProgress(): number {
    return this.currentState.progress;
  }

  getFinalMessage(): string | null {
    return this.currentState.finalMessage;
  }

  dismiss(): void {
    this.clearTimers();
    this.currentState = this.createInactiveState();
    this.notifyListeners();
    this.governor.publish('lastpage:dismissed', {}, 'LastPageExperience', 'low');
  }

  private clearTimers(): void {
    for (const timer of this.phaseTimers) {
      clearTimeout(timer);
    }
    this.phaseTimers = [];
  }

  subscribe(listener: (state: LastPageState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const state = { ...this.currentState };
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (e) {
        console.error('[LastPageExperience] Listener error:', e);
      }
    }
  }

  destroy(): void {
    this.clearTimers();
    this.currentState = this.createInactiveState();
    this.listeners.clear();
  }
}
