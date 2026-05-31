import { EmotionType } from '../types';
import { CharacterProfile } from './CharacterVoiceRegistry';
import { EventGovernor } from '../events/EventGovernor';

export interface ChapterIntelligence {
  chapterIndex: number;
  title: string;
  emotionalArc: EmotionArcEntry[];
  dominantEmotion: EmotionType;
  tensionProfile: number[];
  characterPresent: string[];
  dialogueRatio: number;
  wordCount: number;
  estimatedReadingMinutes: number;
}

export interface EmotionArcEntry {
  sentenceIndex: number;
  emotion: EmotionType;
  intensity: number;
  timestamp: number;
}

export interface RelationshipMemory {
  characterA: string;
  characterB: string;
  coOccurrenceCount: number;
  sharedEmotions: EmotionType[];
  tension: number;
  lastSeenTogether: number;
}

export interface BookTimeline {
  bookId: string;
  chapters: ChapterIntelligence[];
  relationships: RelationshipMemory[];
  emotionalSummary: {
    dominantEmotion: EmotionType;
    emotionalRange: number;
    tensionAverage: number;
    dialoguePercentage: number;
  };
  characterIndex: Map<string, number>;
}

const STORAGE_KEY = 'book_intelligence';

export class BookIntelligenceLayer {
  private governor: EventGovernor;
  private timelines: Map<string, BookTimeline> = new Map();
  private currentBookId: string | null = null;
  private currentChapter: ChapterIntelligence | null = null;

  constructor(governor: EventGovernor) {
    this.governor = governor;
    this.loadFromStorage();
  }

  startBook(bookId: string, chapterCount: number): void {
    this.currentBookId = bookId;

    if (!this.timelines.has(bookId)) {
      this.timelines.set(bookId, {
        bookId,
        chapters: Array.from({ length: chapterCount }, (_, i) => ({
          chapterIndex: i,
          title: `Chapter ${i + 1}`,
          emotionalArc: [],
          dominantEmotion: 'neutral' as EmotionType,
          tensionProfile: [],
          characterPresent: [],
          dialogueRatio: 0,
          wordCount: 0,
          estimatedReadingMinutes: 0,
        })),
        relationships: [],
        emotionalSummary: {
          dominantEmotion: 'neutral',
          emotionalRange: 0,
          tensionAverage: 0,
          dialoguePercentage: 0,
        },
        characterIndex: new Map(),
      });
    }
  }

  startChapter(bookId: string, chapterIndex: number, title: string): void {
    const timeline = this.timelines.get(bookId);
    if (!timeline) return;

    const chapter = timeline.chapters[chapterIndex];
    if (chapter) {
      chapter.title = title;
      chapter.emotionalArc = [];
      chapter.tensionProfile = [];
      chapter.characterPresent = [];
    }

    this.currentChapter = chapter || null;
    this.currentBookId = bookId;
  }

  recordSentence(
    sentenceIndex: number,
    text: string,
    emotion: EmotionType,
    intensity: number,
    characterId: string | null
  ): void {
    if (!this.currentBookId || !this.currentChapter) return;

    const timeline = this.timelines.get(this.currentBookId);
    if (!timeline) return;

    const entry: EmotionArcEntry = {
      sentenceIndex,
      emotion,
      intensity,
      timestamp: Date.now(),
    };

    this.currentChapter.emotionalArc.push(entry);
    this.currentChapter.tensionProfile.push(intensity);

    if (characterId && !this.currentChapter.characterPresent.includes(characterId)) {
      this.currentChapter.characterPresent.push(characterId);
    }

    this.updateRelationships(characterId);

    this.governor.publish('intelligence:sentence_recorded', {
      bookId: this.currentBookId,
      chapterIndex: this.currentChapter.chapterIndex,
      emotion,
    }, 'BookIntelligenceLayer', 'low');
  }

  finishChapter(wordCount: number, dialogueSentenceCount: number, totalSentenceCount: number): void {
    if (!this.currentChapter) return;

    this.currentChapter.wordCount = wordCount;
    this.currentChapter.dialogueRatio = totalSentenceCount > 0
      ? dialogueSentenceCount / totalSentenceCount
      : 0;
    this.currentChapter.estimatedReadingMinutes = Math.round(wordCount / 200);

    this.currentChapter.dominantEmotion = this.computeDominantEmotion(
      this.currentChapter.emotionalArc
    );

    this.saveToStorage();
    this.currentChapter = null;
  }

  private updateRelationships(characterId: string | null): void {
    if (!characterId || !this.currentBookId) return;

    const timeline = this.timelines.get(this.currentBookId);
    if (!timeline) return;

    const present = this.currentChapter?.characterPresent || [];
    for (const otherId of present) {
      if (otherId === characterId) continue;

      let rel = timeline.relationships.find(
        (r) =>
          (r.characterA === characterId && r.characterB === otherId) ||
          (r.characterA === otherId && r.characterB === characterId)
      );

      if (!rel) {
        rel = {
          characterA: characterId,
          characterB: otherId,
          coOccurrenceCount: 0,
          sharedEmotions: [],
          tension: 0,
          lastSeenTogether: Date.now(),
        };
        timeline.relationships.push(rel);
      }

      rel.coOccurrenceCount += 1;
      rel.lastSeenTogether = Date.now();
    }
  }

  private computeDominantEmotion(arc: EmotionArcEntry[]): EmotionType {
    if (arc.length === 0) return 'neutral';

    const counts = new Map<EmotionType, number>();
    for (const entry of arc) {
      counts.set(entry.emotion, (counts.get(entry.emotion) || 0) + entry.intensity);
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

  getChapterIntelligence(bookId: string, chapterIndex: number): ChapterIntelligence | null {
    const timeline = this.timelines.get(bookId);
    return timeline?.chapters[chapterIndex] || null;
  }

  getBookTimeline(bookId: string): BookTimeline | null {
    return this.timelines.get(bookId) || null;
  }

  getEmotionalSummary(bookId: string): BookTimeline['emotionalSummary'] | null {
    const timeline = this.timelines.get(bookId);
    return timeline?.emotionalSummary || null;
  }

  getRelationships(bookId: string): RelationshipMemory[] {
    return this.timelines.get(bookId)?.relationships || [];
  }

  getCharacterAppearances(bookId: string): Map<string, number> {
    return this.timelines.get(bookId)?.characterIndex || new Map();
  }

  getChapterEmotionalArc(bookId: string, chapterIndex: number): EmotionArcEntry[] {
    return this.timelines.get(bookId)?.chapters[chapterIndex]?.emotionalArc || [];
  }

  private async loadFromStorage(): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          for (const [key, value] of Object.entries(parsed)) {
            const timeline = value as BookTimeline;
            timeline.characterIndex = new Map(Object.entries(timeline.characterIndex as unknown as Record<string, number>));
            this.timelines.set(key, timeline);
          }
        }
      }
    } catch (e) {
      console.error('[BookIntelligenceLayer] Failed to load:', e);
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        const obj: Record<string, unknown> = {};
        for (const [key, value] of this.timelines) {
          obj[key] = {
            ...value,
            characterIndex: Object.fromEntries(value.characterIndex),
          };
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
      }
    } catch (e) {
      console.error('[BookIntelligenceLayer] Failed to save:', e);
    }
  }

  clearBook(bookId: string): void {
    this.timelines.delete(bookId);
    this.saveToStorage();
  }

  destroy(): void {
    this.timelines.clear();
    this.currentBookId = null;
    this.currentChapter = null;
  }
}
