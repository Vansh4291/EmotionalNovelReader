import { EmotionType } from '../types';
import { NarrativeArc } from '../narration/NarrativeContextManager';
import { EventGovernor } from '../events/EventGovernor';

export interface ContinuitySnapshot {
  bookId: string;
  chapterIndex: number;
  sentenceIndex: number;
  emotion: EmotionType;
  arcPosition: NarrativeArc['arcPosition'];
  tension: number;
  pacing: number;
  dialogueActive: boolean;
  timestamp: number;
  listeningDuration: number;
  lastChapterTitle: string;
}

export interface ResumeContext {
  snapshot: ContinuitySnapshot;
  timeSinceLastSession: number;
  emotionalSummary: string;
  atmosphereDescription: string;
}

const STORAGE_KEY = 'narrative_continuity';
const MAX_SESSION_GAP_MS = 24 * 60 * 60 * 1000;

const EMOTION_NARRATIVES: Record<EmotionType, {
  calm: string;
  tense: string;
  peak: string;
}> = {
  joy: {
    calm: 'A warm, contented moment',
    tense: 'An uplifting scene builds',
    peak: 'Joy reaches its height',
  },
  sadness: {
    calm: 'A quiet, melancholic atmosphere',
    tense: 'Sorrow deepens',
    peak: 'Grief reaches its peak',
  },
  anger: {
    calm: ' simmering tension',
    tense: 'Anger builds beneath the surface',
    peak: 'Fury erupts',
  },
  fear: {
    calm: 'An uneasy calm',
    tense: 'Dread slowly mounts',
    peak: 'Terror takes hold',
  },
  surprise: {
    calm: 'An unexpected turn',
    tense: 'Something unexpected approaches',
    peak: 'The world shifts',
  },
  neutral: {
    calm: 'A quiet moment',
    tense: 'The story continues',
    peak: 'Events unfold',
  },
};

const ARC_ATMOSPHERE: Record<NarrativeArc['arcPosition'], string> = {
  beginning: 'The scene is just beginning to take shape.',
  rising: 'Tension is building, pulling you forward.',
  peak: 'The moment has arrived. Everything converges.',
  falling: 'The intensity eases. The aftermath settles.',
  resolution: 'A moment of calm. The narrative breathes.',
};

export class SceneContinuity {
  private governor: EventGovernor;
  private currentSnapshot: ContinuitySnapshot | null = null;
  private listeners: Set<(ctx: ResumeContext) => void> = new Set();

  constructor(governor: EventGovernor) {
    this.governor = governor;
  }

  async saveSnapshot(
    bookId: string,
    chapterIndex: number,
    sentenceIndex: number,
    emotion: EmotionType,
    arc: NarrativeArc,
    chapterTitle: string,
    listeningDuration: number
  ): Promise<void> {
    const snapshot: ContinuitySnapshot = {
      bookId,
      chapterIndex,
      sentenceIndex,
      emotion,
      arcPosition: arc.arcPosition,
      tension: arc.currentTension,
      pacing: arc.currentPacing,
      dialogueActive: arc.dialogueActive,
      timestamp: Date.now(),
      listeningDuration,
      lastChapterTitle: chapterTitle,
    };

    this.currentSnapshot = snapshot;

    try {
      const existing = await this.loadAllSnapshots();
      existing[bookId] = snapshot;

      const keys = Object.keys(existing);
      if (keys.length > 20) {
        const sorted = keys.sort((a, b) => {
          const aTime = existing[a]?.timestamp || 0;
          const bTime = existing[b]?.timestamp || 0;
          return aTime - bTime;
        });
        for (let i = 0; i < sorted.length - 20; i++) {
          delete existing[sorted[i]];
        }
      }

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      }
    } catch (e) {
      console.error('[SceneContinuity] Failed to save snapshot:', e);
    }

    this.governor.publish('continuity:saved', {
      bookId,
      emotion,
      arcPosition: arc.arcPosition,
    }, 'SceneContinuity', 'low');
  }

  async getResumeContext(bookId: string): Promise<ResumeContext | null> {
    try {
      const snapshots = await this.loadAllSnapshots();
      const snapshot = snapshots[bookId];

      if (!snapshot) return null;

      const timeSinceLastSession = Date.now() - snapshot.timestamp;

      return {
        snapshot,
        timeSinceLastSession,
        emotionalSummary: this.buildEmotionalSummary(snapshot),
        atmosphereDescription: this.buildAtmosphereDescription(snapshot),
      };
    } catch (e) {
      console.error('[SceneContinuity] Failed to get resume context:', e);
      return null;
    }
  }

  async getLastEmotionalMoment(bookId: string): Promise<string | null> {
    const ctx = await this.getResumeContext(bookId);
    if (!ctx) return null;

    if (ctx.timeSinceLastSession > MAX_SESSION_GAP_MS) {
      return `You left off a while ago. The story awaits.`;
    }

    const { snapshot } = ctx;
    const emotionNarratives = EMOTION_NARRATIVES[snapshot.emotion] || EMOTION_NARRATIVES.neutral;
    const narrative = snapshot.tension > 0.6
      ? emotionNarratives.peak
      : snapshot.tension > 0.3
        ? emotionNarratives.tense
        : emotionNarratives.calm;

    return `You left off during "${snapshot.lastChapterTitle}". ${narrative}.`;
  }

  async hasContinuity(bookId: string): Promise<boolean> {
    try {
      const snapshots = await this.loadAllSnapshots();
      return !!snapshots[bookId];
    } catch {
      return false;
    }
  }

  async clearContinuity(bookId: string): Promise<void> {
    try {
      const snapshots = await this.loadAllSnapshots();
      delete snapshots[bookId];
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
      }
    } catch (e) {
      console.error('[SceneContinuity] Failed to clear continuity:', e);
    }
  }

  private buildEmotionalSummary(snapshot: ContinuitySnapshot): string {
    const emotion = snapshot.emotion;
    const tension = snapshot.tension;

    if (tension > 0.7) {
      return `High tension ${emotion} scene`;
    }
    if (tension > 0.4) {
      return `Moderate ${emotion} atmosphere`;
    }
    return `Calm ${emotion} moment`;
  }

  private buildAtmosphereDescription(snapshot: ContinuitySnapshot): string {
    return ARC_ATMOSPHERE[snapshot.arcPosition] || ARC_ATMOSPHERE.beginning;
  }

  private async loadAllSnapshots(): Promise<Record<string, ContinuitySnapshot>> {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : {};
      }
    } catch {
      return {};
    }
    return {};
  }

  getCurrentSnapshot(): ContinuitySnapshot | null {
    return this.currentSnapshot;
  }

  subscribe(listener: (ctx: ResumeContext) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  destroy(): void {
    this.currentSnapshot = null;
    this.listeners.clear();
  }
}
