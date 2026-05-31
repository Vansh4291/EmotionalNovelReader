import { EmotionType } from '../types';

export interface RhythmSnapshot {
  wordsPerMinute: number;
  sentenceLengthAvg: number;
  silenceDensity: number;
  dialogueVelocity: number;
  pauseIntensity: number;
  pacingGrade: 'very_slow' | 'slow' | 'moderate' | 'fast' | 'very_fast';
  breathingRoom: number;
  narrativeBreath: boolean;
}

export interface RhythmConfig {
  windowSize: number;
  wordsPerMinuteBaseline: number;
  silenceThresholdMs: number;
  dialogueDensityThreshold: number;
}

const DEFAULT_CONFIG: RhythmConfig = {
  windowSize: 10,
  wordsPerMinuteBaseline: 150,
  silenceThresholdMs: 800,
  dialogueDensityThreshold: 0.4,
};

const PACING_GRADES: Array<{
  grade: RhythmSnapshot['pacingGrade'];
  minWPM: number;
  maxWPM: number;
}> = [
  { grade: 'very_slow', minWPM: 0, maxWPM: 100 },
  { grade: 'slow', minWPM: 100, maxWPM: 130 },
  { grade: 'moderate', minWPM: 130, maxWPM: 170 },
  { grade: 'fast', minWPM: 170, maxWPM: 210 },
  { grade: 'very_fast', minWPM: 210, maxWPM: Infinity },
];

interface SentenceRhythm {
  wordCount: number;
  isDialogue: boolean;
  emotion: EmotionType;
  estimatedDurationMs: number;
  pauseBeforeMs: number;
  timestamp: number;
}

export class NarrativeRhythmEngine {
  private config: RhythmConfig;
  private sentenceHistory: SentenceRhythm[] = [];
  private listeners: Set<(snapshot: RhythmSnapshot) => void> = new Set();

  constructor(config: Partial<RhythmConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  processSentence(
    text: string,
    emotion: EmotionType,
    speakingDurationMs: number
  ): RhythmSnapshot {
    const wordCount = text.split(/\s+/).length;
    const isDialogue = this.isDialogue(text);

    const rhythm: SentenceRhythm = {
      wordCount,
      isDialogue,
      emotion,
      estimatedDurationMs: speakingDurationMs,
      pauseBeforeMs: this.estimatePauseBefore(emotion),
      timestamp: Date.now(),
    };

    this.sentenceHistory.push(rhythm);
    if (this.sentenceHistory.length > this.config.windowSize * 2) {
      this.sentenceHistory.shift();
    }

    const snapshot = this.buildSnapshot();

    this.notifyListeners(snapshot);
    return snapshot;
  }

  private buildSnapshot(): RhythmSnapshot {
    const window = this.sentenceHistory.slice(-this.config.windowSize);
    if (window.length === 0) {
      return this.getDefaultSnapshot();
    }

    const wordsPerMinute = this.calculateWPM(window);
    const sentenceLengthAvg = this.calculateAvgSentenceLength(window);
    const silenceDensity = this.calculateSilenceDensity(window);
    const dialogueVelocity = this.calculateDialogueVelocity(window);
    const pauseIntensity = this.calculatePauseIntensity(window);
    const breathingRoom = this.calculateBreathingRoom(window);
    const narrativeBreath = this.detectNarrativeBreath(window);

    const pacingGrade = this.determinePacingGrade(wordsPerMinute);

    return {
      wordsPerMinute,
      sentenceLengthAvg,
      silenceDensity,
      dialogueVelocity,
      pauseIntensity,
      pacingGrade,
      breathingRoom,
      narrativeBreath,
    };
  }

  private calculateWPM(window: SentenceRhythm[]): number {
    const totalWords = window.reduce((sum, s) => sum + s.wordCount, 0);
    const totalDurationMs = window.reduce((sum, s) => sum + s.estimatedDurationMs, 0);

    if (totalDurationMs === 0) return this.config.wordsPerMinuteBaseline;

    const totalMinutes = totalDurationMs / 60000;
    return totalWords / totalMinutes;
  }

  private calculateAvgSentenceLength(window: SentenceRhythm[]): number {
    return window.reduce((sum, s) => sum + s.wordCount, 0) / window.length;
  }

  private calculateSilenceDensity(window: SentenceRhythm[]): number {
    if (window.length < 2) return 0;

    let silenceCount = 0;
    for (let i = 1; i < window.length; i++) {
      const gap = window[i].timestamp - window[i - 1].timestamp - window[i - 1].estimatedDurationMs;
      if (gap > this.config.silenceThresholdMs) {
        silenceCount += 1;
      }
    }

    return silenceCount / (window.length - 1);
  }

  private calculateDialogueVelocity(window: SentenceRhythm[]): number {
    if (window.length === 0) return 0;

    const dialogueSentences = window.filter((s) => s.isDialogue);
    return dialogueSentences.length / window.length;
  }

  private calculatePauseIntensity(window: SentenceRhythm[]): number {
    if (window.length === 0) return 0;

    const avgPause = window.reduce((sum, s) => sum + s.pauseBeforeMs, 0) / window.length;
    return Math.min(1.0, avgPause / 1000);
  }

  private calculateBreathingRoom(window: SentenceRhythm[]): number {
    if (window.length < 3) return 0.5;

    const emotions = window.map((s) => s.emotion);
    const nonNeutralCount = emotions.filter((e) => e !== 'neutral').length;
    const emotionDensity = nonNeutralCount / window.length;

    const avgWordCount = window.reduce((sum, s) => sum + s.wordCount, 0) / window.length;
    const lengthFactor = Math.min(1.0, avgWordCount / 25);

    return 1.0 - (emotionDensity * 0.6 + lengthFactor * 0.4);
  }

  private detectNarrativeBreath(window: SentenceRhythm[]): boolean {
    if (window.length < 4) return false;

    const recent = window.slice(-3);
    const older = window.slice(0, -3);

    const recentWPM = this.calculateWPM(recent);
    const olderWPM = older.length > 0 ? this.calculateWPM(older) : recentWPM;

    const recentEmotions = recent.filter((s) => s.emotion !== 'neutral').length;
    const olderEmotions = older.filter((s) => s.emotion !== 'neutral').length;

    const decelerating = recentWPM < olderWPM * 0.85;
    const calming = recentEmotions < olderEmotions;

    return decelerating || calming;
  }

  private determinePacingGrade(wpm: number): RhythmSnapshot['pacingGrade'] {
    for (const grade of PACING_GRADES) {
      if (wpm >= grade.minWPM && wpm < grade.maxWPM) {
        return grade.grade;
      }
    }
    return 'moderate';
  }

  private estimatePauseBefore(emotion: EmotionType): number {
    const basePauses: Record<EmotionType, number> = {
      joy: 100,
      sadness: 250,
      anger: 50,
      fear: 180,
      surprise: 30,
      neutral: 150,
    };
    return basePauses[emotion] || 150;
  }

  private isDialogue(text: string): boolean {
    const trimmed = text.trim();
    return (
      /^["'"'\u201c\u201d]/.test(trimmed) ||
      /["'"'\u201c\u201d]$/.test(trimmed)
    );
  }

  private getDefaultSnapshot(): RhythmSnapshot {
    return {
      wordsPerMinute: this.config.wordsPerMinuteBaseline,
      sentenceLengthAvg: 12,
      silenceDensity: 0,
      dialogueVelocity: 0,
      pauseIntensity: 0.3,
      pacingGrade: 'moderate',
      breathingRoom: 0.5,
      narrativeBreath: false,
    };
  }

  getUITimingModifier(): number {
    const snapshot = this.buildSnapshot();

    switch (snapshot.pacingGrade) {
      case 'very_slow': return 1.3;
      case 'slow': return 1.15;
      case 'moderate': return 1.0;
      case 'fast': return 0.85;
      case 'very_fast': return 0.7;
      default: return 1.0;
    }
  }

  getAmbientVolumeModifier(): number {
    const snapshot = this.buildSnapshot();
    return 0.8 + snapshot.breathingRoom * 0.4;
  }

  getTransitionDuration(baseDuration: number): number {
    return baseDuration * this.getUITimingModifier();
  }

  subscribe(listener: (snapshot: RhythmSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(snapshot: RhythmSnapshot): void {
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch (e) {
        console.error('[NarrativeRhythmEngine] Listener error:', e);
      }
    }
  }

  reset(): void {
    this.sentenceHistory = [];
  }

  destroy(): void {
    this.reset();
    this.listeners.clear();
  }
}
