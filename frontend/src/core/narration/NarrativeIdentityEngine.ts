import { EmotionType } from '../types';
import { NarrativeArc } from './NarrativeContextManager';
import { EventGovernor } from '../events/EventGovernor';

export interface NarrativeFingerprint {
  bookId: string;
  emotionalSignature: EmotionalSignature;
  pacingSignature: PacingSignature;
  thematicDensity: ThematicDensity;
  atmosphericProfile: AtmosphericProfile;
  silenceProfile: SilenceProfile;
  dialogueIntensity: DialogueIntensity;
  narrativeWeight: number;
  identityHash: string;
}

export interface EmotionalSignature {
  dominantEmotion: EmotionType;
  emotionalRange: number;
  melancholyIndex: number;
  tensionIndex: number;
  warmthIndex: number;
  volatility: number;
  arcPattern: 'slow_burn' | 'rising' | 'oscillating' | 'plateau' | 'declining';
}

export interface PacingSignature {
  averageWPM: number;
  pacingVariance: number;
  breathingFrequency: number;
  accelerationTendency: number;
  stillnessPreference: number;
}

export interface ThematicDensity {
  emotionalDepth: number;
  introspectionRatio: number;
  actionRatio: number;
  dialogueRatio: number;
  descriptionRatio: number;
}

export interface AtmosphericProfile {
  darknessIndex: number;
  warmthIndex: number;
  intensityCeiling: number;
  atmosphericConsistency: number;
  moodSwingFrequency: number;
}

export interface SilenceProfile {
  silenceFrequency: number;
  silenceDuration: number;
  postTensionSilence: number;
  contemplativeSilence: number;
  dreadSilence: number;
}

export interface DialogueIntensity {
  dialoguePercentage: number;
  averageChainLength: number;
  emotionalDialogueRatio: number;
  confrontationRatio: number;
  intimacyRatio: number;
}

const STORAGE_KEY = 'narrative_identity';

export class NarrativeIdentityEngine {
  private governor: EventGovernor;
  private fingerprints: Map<string, NarrativeFingerprint> = new Map();
  private currentBookId: string | null = null;
  private sentenceBuffer: Array<{
    emotion: EmotionType;
    intensity: number;
    wpm: number;
    isDialogue: boolean;
    arc: NarrativeArc;
  }> = [];

  constructor(governor: EventGovernor) {
    this.governor = governor;
    this.loadFromStorage();
  }

  startBook(bookId: string): void {
    this.currentBookId = bookId;
    this.sentenceBuffer = [];

    if (!this.fingerprints.has(bookId)) {
      this.fingerprints.set(bookId, this.createEmptyFingerprint(bookId));
    }
  }

  recordSentence(
    emotion: EmotionType,
    intensity: number,
    wpm: number,
    isDialogue: boolean,
    arc: NarrativeArc
  ): void {
    if (!this.currentBookId) return;

    this.sentenceBuffer.push({ emotion, intensity, wpm, isDialogue, arc });

    if (this.sentenceBuffer.length >= 20) {
      this.recomputeFingerprint();
    }
  }

  finishBook(): NarrativeFingerprint | null {
    if (!this.currentBookId) return null;

    this.recomputeFingerprint();
    const fingerprint = this.fingerprints.get(this.currentBookId) || null;

    this.saveToStorage();

    if (fingerprint) {
      this.governor.publish('identity:fingerprint_computed', {
        bookId: this.currentBookId,
        hash: fingerprint.identityHash,
      }, 'NarrativeIdentityEngine', 'normal');
    }

    this.currentBookId = null;
    this.sentenceBuffer = [];
    return fingerprint;
  }

  private recomputeFingerprint(): void {
    if (!this.currentBookId || this.sentenceBuffer.length === 0) return;

    const existing = this.fingerprints.get(this.currentBookId);
    const fingerprint = existing || this.createEmptyFingerprint(this.currentBookId);

    fingerprint.emotionalSignature = this.computeEmotionalSignature();
    fingerprint.pacingSignature = this.computePacingSignature();
    fingerprint.thematicDensity = this.computeThematicDensity();
    fingerprint.atmosphericProfile = this.computeAtmosphericProfile();
    fingerprint.silenceProfile = this.computeSilenceProfile();
    fingerprint.dialogueIntensity = this.computeDialogueIntensity();
    fingerprint.narrativeWeight = this.computeNarrativeWeight();
    fingerprint.identityHash = this.computeHash(fingerprint);

    this.fingerprints.set(this.currentBookId, fingerprint);
  }

  private computeEmotionalSignature(): EmotionalSignature {
    const buffer = this.sentenceBuffer;
    const emotions = buffer.map((b) => b.emotion);
    const intensities = buffer.map((b) => b.intensity);

    const emotionCounts = new Map<EmotionType, number>();
    for (const e of emotions) {
      emotionCounts.set(e, (emotionCounts.get(e) || 0) + 1);
    }

    let dominantEmotion: EmotionType = 'neutral';
    let maxCount = 0;
    for (const [emotion, count] of emotionCounts) {
      if (count > maxCount) {
        maxCount = count;
        dominantEmotion = emotion;
      }
    }

    const nonNeutral = emotions.filter((e) => e !== 'neutral').length;
    const emotionalRange = nonNeutral / emotions.length;

    const avgIntensity = intensities.reduce((a, b) => a + b, 0) / intensities.length;
    const intensityVariance = intensities.reduce(
      (sum, i) => sum + Math.pow(i - avgIntensity, 2), 0
    ) / intensities.length;

    const sadnessCount = emotionCounts.get('sadness') || 0;
    const melancholyIndex = sadnessCount / emotions.length;

    const angerCount = emotionCounts.get('anger') || 0;
    const fearCount = emotionCounts.get('fear') || 0;
    const tensionIndex = (angerCount + fearCount) / emotions.length;

    const joyCount = emotionCounts.get('joy') || 0;
    const warmthIndex = joyCount / emotions.length;

    const volatility = Math.sqrt(intensityVariance);

    const arcPattern = this.determineArcPattern();

    return {
      dominantEmotion,
      emotionalRange,
      melancholyIndex,
      tensionIndex,
      warmthIndex,
      volatility,
      arcPattern,
    };
  }

  private determineArcPattern(): EmotionalSignature['arcPattern'] {
    const buffer = this.sentenceBuffer;
    if (buffer.length < 10) return 'plateau';

    const firstHalf = buffer.slice(0, Math.floor(buffer.length / 2));
    const secondHalf = buffer.slice(Math.floor(buffer.length / 2));

    const firstAvg = firstHalf.reduce((s, b) => s + b.intensity, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, b) => s + b.intensity, 0) / secondHalf.length;

    const diff = secondAvg - firstAvg;

    if (diff > 0.15) return 'rising';
    if (diff < -0.15) return 'declining';

    const variance = buffer.reduce((s, b) => s + b.intensity, 0) / buffer.length;
    if (variance > 0.3) return 'oscillating';

    const recent = buffer.slice(-15);
    const recentVariance = recent.reduce((s, b) => s + b.intensity, 0) / recent.length;
    if (Math.abs(recentVariance - firstAvg) < 0.1) return 'plateau';

    return 'slow_burn';
  }

  private computePacingSignature(): PacingSignature {
    const buffer = this.sentenceBuffer;
    const wpmValues = buffer.map((b) => b.wpm);

    const averageWPM = wpmValues.reduce((a, b) => a + b, 0) / wpmValues.length;
    const wpmVariance = wpmValues.reduce(
      (s, w) => s + Math.pow(w - averageWPM, 2), 0
    ) / wpmValues.length;

    const breathingFrequency = this.countBreathingEvents();
    const accelerationTendency = this.computeAccelerationTendency();
    const stillnessPreference = this.computeStillnessPreference();

    return {
      averageWPM,
      pacingVariance: Math.sqrt(wpmVariance),
      breathingFrequency,
      accelerationTendency,
      stillnessPreference,
    };
  }

  private countBreathingEvents(): number {
    const buffer = this.sentenceBuffer;
    let breaths = 0;

    for (let i = 3; i < buffer.length; i++) {
      const recent = buffer.slice(i - 3, i);
      const older = buffer.slice(Math.max(0, i - 6), i - 3);

      if (older.length === 0) continue;

      const recentWPM = recent.reduce((s, b) => s + b.wpm, 0) / recent.length;
      const olderWPM = older.reduce((s, b) => s + b.wpm, 0) / older.length;

      if (recentWPM < olderWPM * 0.8) {
        breaths += 1;
      }
    }

    return breaths;
  }

  private computeAccelerationTendency(): number {
    const buffer = this.sentenceBuffer;
    if (buffer.length < 4) return 0;

    const firstQuarter = buffer.slice(0, Math.floor(buffer.length / 4));
    const lastQuarter = buffer.slice(Math.floor(buffer.length * 3 / 4));

    const firstWPM = firstQuarter.reduce((s, b) => s + b.wpm, 0) / firstQuarter.length;
    const lastWPM = lastQuarter.reduce((s, b) => s + b.wpm, 0) / lastQuarter.length;

    return (lastWPM - firstWPM) / firstWPM;
  }

  private computeStillnessPreference(): number {
    const buffer = this.sentenceBuffer;
    const neutralCount = buffer.filter((b) => b.emotion === 'neutral').length;
    return neutralCount / buffer.length;
  }

  private computeThematicDensity(): ThematicDensity {
    const buffer = this.sentenceBuffer;
    const total = buffer.length;

    const dialogueCount = buffer.filter((b) => b.isDialogue).length;
    const dialogueRatio = dialogueCount / total;

    const highIntensity = buffer.filter((b) => b.intensity > 0.6).length;
    const actionRatio = highIntensity / total;

    const lowIntensity = buffer.filter((b) => b.intensity < 0.3).length;
    const introspectionRatio = lowIntensity / total;

    const descriptionRatio = 1 - dialogueRatio - actionRatio;

    const emotionalDepth = buffer.filter(
      (b) => b.emotion !== 'neutral' && b.intensity > 0.5
    ).length / total;

    return {
      emotionalDepth,
      introspectionRatio,
      actionRatio,
      dialogueRatio,
      descriptionRatio,
    };
  }

  private computeAtmosphericProfile(): AtmosphericProfile {
    const buffer = this.sentenceBuffer;
    const emotions = buffer.map((b) => b.emotion);

    const darknessCount = emotions.filter(
      (e) => e === 'sadness' || e === 'fear' || e === 'anger'
    ).length;
    const darknessIndex = darknessCount / emotions.length;

    const warmthCount = emotions.filter(
      (e) => e === 'joy'
    ).length;
    const warmthIndex = warmthCount / emotions.length;

    const intensities = buffer.map((b) => b.intensity);
    const intensityCeiling = Math.max(...intensities);

    const avgIntensity = intensities.reduce((a, b) => a + b, 0) / intensities.length;
    const intensityVariance = intensities.reduce(
      (s, i) => s + Math.pow(i - avgIntensity, 2), 0
    ) / intensities.length;
    const atmosphericConsistency = 1 - Math.sqrt(intensityVariance);

    let moodSwingCount = 0;
    for (let i = 1; i < emotions.length; i++) {
      if (emotions[i] !== emotions[i - 1] && emotions[i] !== 'neutral') {
        moodSwingCount += 1;
      }
    }
    const moodSwingFrequency = moodSwingCount / emotions.length;

    return {
      darknessIndex,
      warmthIndex,
      intensityCeiling,
      atmosphericConsistency,
      moodSwingFrequency,
    };
  }

  private computeSilenceProfile(): SilenceProfile {
    const buffer = this.sentenceBuffer;
    const total = buffer.length;

    const neutralCount = buffer.filter((b) => b.emotion === 'neutral').length;
    const silenceFrequency = neutralCount / total;

    const lowIntensity = buffer.filter((b) => b.intensity < 0.2);
    const silenceDuration = lowIntensity.length / total;

    let postTensionCount = 0;
    let contemplativeCount = 0;
    let dreadCount = 0;

    for (let i = 1; i < buffer.length; i++) {
      if (buffer[i].emotion === 'neutral' && buffer[i - 1].intensity > 0.6) {
        postTensionCount += 1;
      }
      if (buffer[i].emotion === 'neutral' && buffer[i].wpm < 120) {
        contemplativeCount += 1;
      }
      if (buffer[i].emotion === 'neutral' && buffer[i - 1].emotion === 'fear') {
        dreadCount += 1;
      }
    }

    return {
      silenceFrequency,
      silenceDuration,
      postTensionSilence: postTensionCount / total,
      contemplativeSilence: contemplativeCount / total,
      dreadSilence: dreadCount / total,
    };
  }

  private computeDialogueIntensity(): DialogueIntensity {
    const buffer = this.sentenceBuffer;
    const total = buffer.length;

    const dialogueSentences = buffer.filter((b) => b.isDialogue);
    const dialoguePercentage = dialogueSentences.length / total;

    let currentChain = 0;
    let maxChain = 0;
    let totalChains = 0;
    let emotionalDialogue = 0;
    let confrontation = 0;
    let intimacy = 0;

    for (const sentence of buffer) {
      if (sentence.isDialogue) {
        currentChain += 1;
        if (sentence.emotion !== 'neutral') emotionalDialogue += 1;
        if (sentence.emotion === 'anger') confrontation += 1;
        if (sentence.emotion === 'joy' && sentence.intensity > 0.4) intimacy += 1;
      } else {
        if (currentChain > 0) {
          maxChain = Math.max(maxChain, currentChain);
          totalChains += 1;
        }
        currentChain = 0;
      }
    }

    const averageChainLength = totalChains > 0
      ? dialogueSentences.length / totalChains
      : 0;

    return {
      dialoguePercentage,
      averageChainLength,
      emotionalDialogueRatio: dialogueSentences.length > 0
        ? emotionalDialogue / dialogueSentences.length
        : 0,
      confrontationRatio: dialogueSentences.length > 0
        ? confrontation / dialogueSentences.length
        : 0,
      intimacyRatio: dialogueSentences.length > 0
        ? intimacy / dialogueSentences.length
        : 0,
    };
  }

  private computeNarrativeWeight(): number {
    const fp = this.fingerprints.get(this.currentBookId!);
    if (!fp) return 0;

    const emotionalDepth = fp.thematicDensity.emotionalDepth;
    const tension = fp.emotionalSignature.tensionIndex;
    const melancholy = fp.emotionalSignature.melancholyIndex;
    const silenceDepth = fp.silenceProfile.silenceFrequency;
    const dialogueWeight = fp.dialogueIntensity.emotionalDialogueRatio;

    return (
      emotionalDepth * 0.3 +
      tension * 0.2 +
      melancholy * 0.2 +
      silenceDepth * 0.15 +
      dialogueWeight * 0.15
    );
  }

  private computeHash(fingerprint: NarrativeFingerprint): string {
    const es = fingerprint.emotionalSignature;
    const ps = fingerprint.pacingSignature;
    const str = `${es.dominantEmotion}_${es.arcPattern}_${ps.averageWPM.toFixed(0)}_${fingerprint.narrativeWeight.toFixed(2)}`;

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return `fp_${hash.toString(36)}`;
  }

  private createEmptyFingerprint(bookId: string): NarrativeFingerprint {
    return {
      bookId,
      emotionalSignature: {
        dominantEmotion: 'neutral',
        emotionalRange: 0,
        melancholyIndex: 0,
        tensionIndex: 0,
        warmthIndex: 0,
        volatility: 0,
        arcPattern: 'plateau',
      },
      pacingSignature: {
        averageWPM: 150,
        pacingVariance: 0,
        breathingFrequency: 0,
        accelerationTendency: 0,
        stillnessPreference: 0.5,
      },
      thematicDensity: {
        emotionalDepth: 0,
        introspectionRatio: 0,
        actionRatio: 0,
        dialogueRatio: 0,
        descriptionRatio: 1,
      },
      atmosphericProfile: {
        darknessIndex: 0,
        warmthIndex: 0,
        intensityCeiling: 0,
        atmosphericConsistency: 1,
        moodSwingFrequency: 0,
      },
      silenceProfile: {
        silenceFrequency: 0,
        silenceDuration: 0,
        postTensionSilence: 0,
        contemplativeSilence: 0,
        dreadSilence: 0,
      },
      dialogueIntensity: {
        dialoguePercentage: 0,
        averageChainLength: 0,
        emotionalDialogueRatio: 0,
        confrontationRatio: 0,
        intimacyRatio: 0,
      },
      narrativeWeight: 0,
      identityHash: '',
    };
  }

  getFingerprint(bookId: string): NarrativeFingerprint | null {
    return this.fingerprints.get(bookId) || null;
  }

  getAllFingerprints(): NarrativeFingerprint[] {
    return Array.from(this.fingerprints.values());
  }

  private async loadFromStorage(): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          for (const [key, value] of Object.entries(parsed)) {
            this.fingerprints.set(key, value as NarrativeFingerprint);
          }
        }
      }
    } catch (e) {
      console.error('[NarrativeIdentityEngine] Failed to load:', e);
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        const obj = Object.fromEntries(this.fingerprints);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
      }
    } catch (e) {
      console.error('[NarrativeIdentityEngine] Failed to save:', e);
    }
  }

  destroy(): void {
    this.fingerprints.clear();
    this.sentenceBuffer = [];
    this.currentBookId = null;
  }
}
