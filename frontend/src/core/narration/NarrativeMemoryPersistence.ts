import { EmotionType } from '../types';
import { NarrativeArc, SceneSnapshot } from '../narration/NarrativeContextManager';
import { EventGovernor } from '../events/EventGovernor';

export interface NarrativeMemory {
  bookId: string;
  timestamp: number;
  emotion: EmotionType;
  arc: {
    position: NarrativeArc['arcPosition'];
    tension: number;
    pacing: number;
    emotionalMomentum: number;
  };
  ambient: {
    enabled: boolean;
    preset: string;
    masterVolume: number;
  };
  typography: {
    storySize: number;
    storyLineHeight: number;
  };
  listening: {
    totalSeconds: number;
    sessionCount: number;
    lastSessionDuration: number;
  };
  sceneSnapshots: SceneSnapshot[];
}

export interface RestoreContext {
  memory: NarrativeMemory;
  timeSinceLastSession: number;
  shouldRestoreAmbient: boolean;
  shouldRestoreTheme: boolean;
  emotionalGreeting: string;
}

const STORAGE_KEY = 'narrative_memory';
const MAX_MEMORY_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_BOOKS_IN_MEMORY = 30;

const EMOTION_GREETINGS: Record<EmotionType, {
  short: string;
  long: (chapter: string) => string;
}> = {
  joy: {
    short: 'Welcome back to a warm moment.',
    long: (ch) => `The story continues in ${ch}. A warm feeling lingers.`,
  },
  sadness: {
    short: 'The story holds its melancholy.',
    long: (ch) => `In ${ch}, the quiet weight remains.`,
  },
  anger: {
    short: 'Tension still simmers.',
    long: (ch) => `In ${ch}, the fire has not yet faded.`,
  },
  fear: {
    short: 'An uneasy silence.',
    long: (ch) => `In ${ch}, the shadows still linger.`,
  },
  surprise: {
    short: 'Something has shifted.',
    long: (ch) => `In ${ch}, the world turned unexpectedly.`,
  },
  neutral: {
    short: 'The story awaits.',
    long: (ch) => `Returning to ${ch}.`,
  },
};

export class NarrativeMemoryPersistence {
  private governor: EventGovernor;
  private memories: Map<string, NarrativeMemory> = new Map();
  private listeners: Set<(memory: NarrativeMemory) => void> = new Set();

  constructor(governor: EventGovernor) {
    this.governor = governor;
    this.loadFromStorage();
  }

  async saveMemory(
    bookId: string,
    emotion: EmotionType,
    arc: NarrativeArc,
    ambientEnabled: boolean,
    ambientPreset: string,
    ambientVolume: number,
    listeningSeconds: number,
    sceneSnapshots: SceneSnapshot[]
  ): Promise<void> {
    const existing = this.memories.get(bookId);

    const memory: NarrativeMemory = {
      bookId,
      timestamp: Date.now(),
      emotion,
      arc: {
        position: arc.arcPosition,
        tension: arc.currentTension,
        pacing: arc.currentPacing,
        emotionalMomentum: arc.emotionalMomentum,
      },
      ambient: {
        enabled: ambientEnabled,
        preset: ambientPreset,
        masterVolume: ambientVolume,
      },
      typography: {
        storySize: 20,
        storyLineHeight: 1.75,
      },
      listening: {
        totalSeconds: (existing?.listening.totalSeconds || 0) + listeningSeconds,
        sessionCount: (existing?.listening.sessionCount || 0) + 1,
        lastSessionDuration: listeningSeconds,
      },
      sceneSnapshots: sceneSnapshots.slice(-10),
    };

    this.memories.set(bookId, memory);

    this.pruneOldMemories();
    await this.saveToStorage();

    this.governor.publish('memory:saved', {
      bookId,
      emotion,
      sessionCount: memory.listening.sessionCount,
    }, 'NarrativeMemoryPersistence', 'low');
  }

  async getMemory(bookId: string): Promise<NarrativeMemory | null> {
    return this.memories.get(bookId) || null;
  }

  async getRestoreContext(bookId: string): Promise<RestoreContext | null> {
    const memory = this.memories.get(bookId);
    if (!memory) return null;

    const timeSinceLastSession = Date.now() - memory.timestamp;
    const recentSession = timeSinceLastSession < MAX_MEMORY_AGE_MS;

    return {
      memory,
      timeSinceLastSession,
      shouldRestoreAmbient: recentSession && memory.ambient.enabled,
      shouldRestoreTheme: recentSession,
      emotionalGreeting: this.buildGreeting(memory),
    };
  }

  async getAllMemories(): Promise<NarrativeMemory[]> {
    return Array.from(this.memories.values()).sort(
      (a, b) => b.timestamp - a.timestamp
    );
  }

  async getRecentBooks(limit = 5): Promise<NarrativeMemory[]> {
    const all = await this.getAllMemories();
    return all.slice(0, limit);
  }

  async clearMemory(bookId: string): Promise<void> {
    this.memories.delete(bookId);
    await this.saveToStorage();
  }

  async clearAllMemories(): Promise<void> {
    this.memories.clear();
    await this.saveToStorage();
  }

  private buildGreeting(memory: NarrativeMemory): string {
    const greeting = EMOTION_GREETINGS[memory.emotion] || EMOTION_GREETINGS.neutral;
    const lastScene = memory.sceneSnapshots[memory.sceneSnapshots.length - 1];
    const chapterNum = lastScene ? lastScene.sceneIndex + 1 : 1;

    if (memory.listening.sessionCount > 1) {
      return greeting.long(`Chapter ${chapterNum}`);
    }
    return greeting.short;
  }

  private pruneOldMemories(): void {
    if (this.memories.size <= MAX_BOOKS_IN_MEMORY) return;

    const sorted = Array.from(this.memories.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );

    const toRemove = sorted.slice(0, sorted.length - MAX_BOOKS_IN_MEMORY);
    for (const [bookId] of toRemove) {
      this.memories.delete(bookId);
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          for (const [key, value] of Object.entries(parsed)) {
            this.memories.set(key, value as NarrativeMemory);
          }
        }
      }
    } catch (e) {
      console.error('[NarrativeMemoryPersistence] Failed to load:', e);
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        const obj = Object.fromEntries(this.memories);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
      }
    } catch (e) {
      console.error('[NarrativeMemoryPersistence] Failed to save:', e);
    }
  }

  subscribe(listener: (memory: NarrativeMemory) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  destroy(): void {
    this.memories.clear();
    this.listeners.clear();
  }
}
