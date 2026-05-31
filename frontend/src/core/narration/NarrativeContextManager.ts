import { SentenceData, EmotionType } from '../types';

export interface SceneSnapshot {
  sceneIndex: number;
  tension: number;
  pacing: number;
  emotionalMomentum: number;
  dialogueChainLength: number;
  isEscalating: boolean;
  dominantEmotion: EmotionType;
  sentenceCount: number;
}

export interface NarrativeArc {
  currentTension: number;
  currentPacing: number;
  emotionalMomentum: number;
  dialogueActive: boolean;
  dialogueChainLength: number;
  sceneIndex: number;
  arcPosition: 'beginning' | 'rising' | 'peak' | 'falling' | 'resolution';
}

interface EmotionVector {
  emotion: EmotionType;
  intensity: number;
  timestamp: number;
}

const TENSION_DECAY = 0.92;
const PACING_WINDOW = 8;
const MOMENTUM_WINDOW = 12;
const DIALOGUE_THRESHOLD = 3;
const SCENE_BREAK_SENTENCES = 25;
const ESCALATION_THRESHOLD = 0.15;

export class NarrativeContextManager {
  private tension = 0.3;
  private pacing = 0.5;
  private emotionalMomentum = 0;
  private dialogueChainLength = 0;
  private sceneIndex = 0;
  private sentenceCount = 0;

  private emotionHistory: EmotionVector[] = [];
  private tensionHistory: number[] = [];
  private pacingHistory: number[] = [];
  private recentSentences: string[] = [];

  private sceneSnapshots: SceneSnapshot[] = [];

  processSentence(
    text: string,
    emotion: EmotionType,
    confidence: number
  ): NarrativeArc {
    this.sentenceCount += 1;

    const intensity = this.computeEmotionIntensity(emotion, confidence);
    this.emotionHistory.push({
      emotion,
      intensity,
      timestamp: Date.now(),
    });
    if (this.emotionHistory.length > MOMENTUM_WINDOW * 2) {
      this.emotionHistory.shift();
    }

    this.updateTension(emotion, intensity, text);
    this.updatePacing(text);
    this.updateEmotionalMomentum(emotion, intensity);
    this.updateDialogueChain(text);

    if (this.shouldBreakScene()) {
      this.captureSceneSnapshot();
      this.sceneIndex += 1;
      this.applySceneTransition();
    }

    this.recentSentences.push(text);
    if (this.recentSentences.length > 20) {
      this.recentSentences.shift();
    }

    return this.buildArc();
  }

  private computeEmotionIntensity(
    emotion: EmotionType,
    confidence: number
  ): number {
    if (emotion === 'neutral') return 0.1 * confidence;

    const recentEmotions = this.emotionHistory.slice(-MOMENTUM_WINDOW);
    const sameCount = recentEmotions.filter(
      (e) => e.emotion === emotion
    ).length;
    const consistency = recentEmotions.length > 0
      ? sameCount / recentEmotions.length
      : 0;

    const baseIntensity = confidence * 0.6 + consistency * 0.4;
    const historyBonus = Math.min(recentEmotions.length / MOMENTUM_WINDOW, 1) * 0.15;

    return Math.min(1.0, baseIntensity + historyBonus);
  }

  private updateTension(
    emotion: EmotionType,
    intensity: number,
    text: string
  ): void {
    const tensionDelta = this.getEmotionTensionContribution(emotion, intensity);

    const hasExclamation = text.includes('!');
    const hasQuestion = text.includes('?');
    const isShortSentence = text.split(/\s+/).length < 6;

    const structuralBonus =
      (hasExclamation ? 0.08 : 0) +
      (hasQuestion ? 0.03 : 0) +
      (isShortSentence && intensity > 0.5 ? 0.05 : 0);

    this.tension = Math.max(0, Math.min(1.0,
      this.tension * TENSION_DECAY + tensionDelta + structuralBonus
    ));

    this.tensionHistory.push(this.tension);
    if (this.tensionHistory.length > PACING_WINDOW * 3) {
      this.tensionHistory.shift();
    }
  }

  private getEmotionTensionContribution(
    emotion: EmotionType,
    intensity: number
  ): number {
    const contributions: Record<EmotionType, number> = {
      anger: 0.25,
      fear: 0.22,
      surprise: 0.15,
      sadness: 0.08,
      joy: -0.02,
      neutral: -0.05,
    };
    return (contributions[emotion] || 0) * intensity;
  }

  private updatePacing(text: string): void {
    const wordCount = text.split(/\s+/).length;
    const sentenceLen = Math.min(wordCount / 30, 1.0);

    const recentTensions = this.tensionHistory.slice(-PACING_WINDOW);
    if (recentTensions.length >= 2) {
      const trend = this.computeTrend(recentTensions);
      this.pacing = Math.max(0, Math.min(1.0, 0.5 + trend * 2 + sentenceLen * 0.3));
    } else {
      this.pacing = Math.max(0.1, Math.min(1.0, 0.5 + sentenceLen * 0.3));
    }

    this.pacingHistory.push(this.pacing);
    if (this.pacingHistory.length > PACING_WINDOW * 2) {
      this.pacingHistory.shift();
    }
  }

  private computeTrend(values: number[]): number {
    if (values.length < 2) return 0;
    const n = values.length;
    const recentHalf = values.slice(Math.floor(n / 2));
    const oldHalf = values.slice(0, Math.floor(n / 2));

    const recentAvg = recentHalf.reduce((a, b) => a + b, 0) / recentHalf.length;
    const oldAvg = oldHalf.reduce((a, b) => a + b, 0) / oldHalf.length;

    return recentAvg - oldAvg;
  }

  private updateEmotionalMomentum(
    emotion: EmotionType,
    intensity: number
  ): void {
    if (this.emotionHistory.length < 3) {
      this.emotionalMomentum = 0;
      return;
    }

    const window = this.emotionHistory.slice(-MOMENTUM_WINDOW);
    const emotionCounts = new Map<EmotionType, number>();

    for (const entry of window) {
      emotionCounts.set(entry.emotion, (emotionCounts.get(entry.emotion) || 0) + entry.intensity);
    }

    let dominantEmotion: EmotionType = 'neutral';
    let maxWeight = 0;
    for (const [e, w] of emotionCounts) {
      if (w > maxWeight) {
        maxWeight = w;
        dominantEmotion = e;
      }
    }

    const recentDominant = window.slice(-Math.floor(window.length / 2));
    const oldDominant = window.slice(0, Math.floor(window.length / 2));

    const recentDominantCount = recentDominant.filter(
      (e) => e.emotion === dominantEmotion
    ).length;
    const oldDominantCount = oldDominant.filter(
      (e) => e.emotion === dominantEmotion
    ).length;

    const recentRate = recentDominant.length > 0
      ? recentDominantCount / recentDominant.length
      : 0;
    const oldRate = oldDominant.length > 0
      ? oldDominantCount / oldDominant.length
      : 0;

    this.emotionalMomentum = recentRate - oldRate;
  }

  private updateDialogueChain(text: string): void {
    const trimmed = text.trim();
    const hasDialogueMarker =
      /^["'"'\u201c\u201d]/.test(trimmed) ||
      /["'"'\u201c\u201d]$/.test(trimmed) ||
      /\b(said|asked|replied|whispered|shouted|murmured|exclaimed)\b/i.test(trimmed);

    if (hasDialogueMarker) {
      this.dialogueChainLength += 1;
    } else {
      if (this.dialogueChainLength > 0) {
        this.dialogueChainLength = Math.max(0, this.dialogueChainLength - 1);
      }
    }
  }

  private shouldBreakScene(): boolean {
    if (this.sentenceCount % SCENE_BREAK_SENTENCES !== 0) return false;
    if (this.sentenceCount === 0) return false;

    const recentTensions = this.tensionHistory.slice(-5);
    if (recentTensions.length < 3) return false;

    const trend = this.computeTrend(recentTensions);
    return Math.abs(trend) > ESCALATION_THRESHOLD;
  }

  private captureSceneSnapshot(): void {
    this.sceneSnapshots.push({
      sceneIndex: this.sceneIndex,
      tension: this.tension,
      pacing: this.pacing,
      emotionalMomentum: this.emotionalMomentum,
      dialogueChainLength: this.dialogueChainLength,
      isEscalating: this.tension > 0.5,
      dominantEmotion: this.getDominantEmotion(),
      sentenceCount: this.sentenceCount,
    });
  }

  private applySceneTransition(): void {
    this.tension = Math.max(0.15, this.tension * 0.7);
    this.pacing = 0.4;
    this.dialogueChainLength = 0;
  }

  private getDominantEmotion(): EmotionType {
    const recent = this.emotionHistory.slice(-MOMENTUM_WINDOW);
    if (recent.length === 0) return 'neutral';

    const counts = new Map<EmotionType, number>();
    for (const e of recent) {
      counts.set(e.emotion, (counts.get(e.emotion) || 0) + e.intensity);
    }

    let dominant: EmotionType = 'neutral';
    let max = 0;
    for (const [emotion, weight] of counts) {
      if (weight > max) {
        max = weight;
        dominant = emotion;
      }
    }
    return dominant;
  }

  private buildArc(): NarrativeArc {
    const position = this.determineArcPosition();

    return {
      currentTension: this.tension,
      currentPacing: this.pacing,
      emotionalMomentum: this.emotionalMomentum,
      dialogueActive: this.dialogueChainLength >= DIALOGUE_THRESHOLD,
      dialogueChainLength: this.dialogueChainLength,
      sceneIndex: this.sceneIndex,
      arcPosition: position,
    };
  }

  private determineArcPosition(): NarrativeArc['arcPosition'] {
    if (this.sceneSnapshots.length === 0) return 'beginning';

    const recentSnapshots = this.sceneSnapshots.slice(-3);
    const tensionTrend = this.computeTrend(
      recentSnapshots.map((s) => s.tension)
    );

    if (this.tension < 0.25) return 'resolution';
    if (this.tension > 0.75) return 'peak';
    if (tensionTrend > ESCALATION_THRESHOLD) return 'rising';
    if (tensionTrend < -ESCALATION_THRESHOLD) return 'falling';
    return 'rising';
  }

  getCurrentArc(): NarrativeArc {
    return this.buildArc();
  }

  getSceneSnapshots(): ReadonlyArray<SceneSnapshot> {
    return this.sceneSnapshots;
  }

  getTensionHistory(): ReadonlyArray<number> {
    return this.tensionHistory;
  }

  getPacingHistory(): ReadonlyArray<number> {
    return this.pacingHistory;
  }

  getEmotionHistory(): ReadonlyArray<EmotionVector> {
    return this.emotionHistory;
  }

  getDialogueChainLength(): number {
    return this.dialogueChainLength;
  }

  getSentenceCount(): number {
    return this.sentenceCount;
  }

  reset(): void {
    this.tension = 0.3;
    this.pacing = 0.5;
    this.emotionalMomentum = 0;
    this.dialogueChainLength = 0;
    this.sceneIndex = 0;
    this.sentenceCount = 0;
    this.emotionHistory = [];
    this.tensionHistory = [];
    this.pacingHistory = [];
    this.recentSentences = [];
    this.sceneSnapshots = [];
  }
}
