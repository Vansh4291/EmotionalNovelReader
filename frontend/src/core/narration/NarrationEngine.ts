import Tts from 'react-native-tts';
import { PlaybackMachine } from '../playback/PlaybackMachine';
import { EventGovernor } from '../events/EventGovernor';
import { EmotionEngine } from '../emotion/EmotionEngine';
import { NarrativeContextManager, NarrativeArc } from './NarrativeContextManager';
import {
  PlaybackState,
  PlaybackEvent,
  SentenceData,
  ChapterMeta,
  EmotionType,
} from '../types';

export interface NarrationDependencies {
  loadChapter: (bookId: string, chapterIndex: number) => Promise<SentenceData[]>;
  saveProgress: (bookId: string, chapterIndex: number, sentenceIndex: number) => Promise<void>;
}

export interface NarrationSnapshot {
  state: PlaybackState;
  bookId: string;
  chapterIndex: number;
  sentenceIndex: number;
  sentences: SentenceData[];
  chapters: ChapterMeta[];
  speed: number;
  pitch: number;
  isPlaying: boolean;
  currentEmotion: EmotionType;
  currentText: string | null;
}

type SnapshotListener = (snapshot: NarrationSnapshot) => void;

export class NarrationEngine {
  private machine: PlaybackMachine;
  private governor: EventGovernor;
  private emotionEngine: EmotionEngine;
  private narrativeContext: NarrativeContextManager;
  private deps: NarrationDependencies;
  private snapshotListeners: Set<SnapshotListener> = new Set();
  private currentArc: NarrativeArc | null = null;
  private ttsFinishHandler: (() => void) | null = null;
  private ttsCancelHandler: (() => void) | null = null;

  constructor(
    deps: NarrationDependencies,
    existingGovernor?: EventGovernor
  ) {
    this.deps = deps;
    this.machine = new PlaybackMachine();
    this.governor = existingGovernor || new EventGovernor();
    this.emotionEngine = new EmotionEngine();
    this.narrativeContext = new NarrativeContextManager();

    this.machine.subscribe(() => this.emitSnapshot());
    this.setupTTSCallbacks();
    this.setupGovernorSubscriptions();
  }

  get state(): PlaybackState {
    return this.machine.getState();
  }

  get context() {
    return this.machine.getContext();
  }

  getCurrentArc(): NarrativeArc | null {
    return this.currentArc;
  }

  getNarrativeContext(): NarrativeContextManager {
    return this.narrativeContext;
  }

  private setupTTSCallbacks(): void {
    Tts.addEventListener('tts-finish', () => {
      this.handleTTSFinish();
    });

    Tts.addEventListener('tts-cancel', () => {
      this.handleTTSCancel();
    });
  }

  private setupGovernorSubscriptions(): void {
    this.governor.subscribe('tts:finish', () => {
      this.handleTTSFinish();
    });

    this.governor.subscribe('tts:cancel', () => {
      this.handleTTSCancel();
    });

    this.governor.subscribe('audio:interruption', (event) => {
      const reason = (event.payload as { reason: string }).reason;
      this.send({
        type: 'AUDIO_INTERRUPTION',
        reason: reason as 'focus_lost' | 'phone_call' | 'bluetooth_disconnect',
      });
    });

    this.governor.subscribe('audio:interruption_end', () => {
      this.send({ type: 'AUDIO_INTERRUPTION_END' });
    });

    this.governor.subscribe('sleep:expired', () => {
      this.send({ type: 'SLEEP_TIMER_EXPIRED' });
    });
  }

  private handleTTSFinish(): void {
    const result = this.machine.send({ type: 'TTS_FINISH' });
    if (!result.accepted) return;

    const ctx = this.machine.getContext();
    this.saveProgressQuiet(ctx.bookId, ctx.currentChapterIndex, ctx.currentSentenceIndex);

    if (ctx.currentSentenceIndex < ctx.sentences.length - 1) {
      this.machine.send({ type: 'NEXT_SENTENCE' });
      const updated = this.machine.getContext();
      this.speakCurrentSentence(updated);
    } else if (ctx.currentChapterIndex < ctx.chapters.length - 1) {
      this.machine.send({ type: 'NEXT_CHAPTER', autoPlay: true });
      this.loadAndSpeakChapter(ctx.currentChapterIndex + 1, true);
    } else {
      this.machine.send({ type: 'STOP' });
    }

    this.emitSnapshot();
  }

  private handleTTSCancel(): void {
    this.machine.send({ type: 'TTS_CANCEL' });
    this.emitSnapshot();
  }

  async loadBook(
    bookId: string,
    chapters: ChapterMeta[],
    chapterIndex = 0,
    sentenceIndex = 0
  ): Promise<void> {
    this.narrativeContext.reset();
    this.currentArc = null;

    this.machine.send({
      type: 'LOAD_BOOK',
      bookId,
      chapterIndex,
      sentenceIndex,
    });

    this.machine.send({
      type: 'BOOK_LOADED',
      chapters,
    });

    await this.loadAndSpeakChapter(chapterIndex, false, sentenceIndex);
  }

  private async loadAndSpeakChapter(
    chapterIndex: number,
    autoPlay: boolean,
    sentenceIndex = 0
  ): Promise<void> {
    const ctx = this.machine.getContext();

    try {
      const sentences = await this.deps.loadChapter(ctx.bookId, chapterIndex);

      this.machine.send({
        type: 'CHAPTER_LOADED',
        chapterIndex,
        sentences,
      });

      this.machine.send({ type: 'SEEK_CHAPTER', chapterIndex, sentenceIndex });

      if (autoPlay) {
        this.machine.send({ type: 'PLAY' });
        const updated = this.machine.getContext();
        this.speakCurrentSentence(updated);
      }

      this.emitSnapshot();
    } catch (e) {
      this.machine.send({
        type: 'ERROR_THROWN',
        error: e instanceof Error ? e.message : 'Failed to load chapter',
      });
    }
  }

  play(): void {
    const result = this.machine.send({ type: 'PLAY' });
    if (result.accepted) {
      const ctx = this.machine.getContext();
      this.speakCurrentSentence(ctx);
    }
  }

  pause(): void {
    this.machine.send({ type: 'PAUSE' });
    Tts.stop();
  }

  stop(): void {
    this.machine.send({ type: 'STOP' });
    Tts.stop();
  }

  nextSentence(): void {
    const ctx = this.machine.getContext();
    Tts.stop();
    this.machine.send({ type: 'NEXT_SENTENCE' });

    if (ctx.isPlaying) {
      const updated = this.machine.getContext();
      this.speakCurrentSentence(updated);
    }

    this.deps.saveProgress(
      ctx.bookId,
      ctx.currentChapterIndex,
      this.machine.getContext().currentSentenceIndex
    );
  }

  previousSentence(): void {
    const ctx = this.machine.getContext();
    Tts.stop();
    this.machine.send({ type: 'PREVIOUS_SENTENCE' });

    if (ctx.isPlaying) {
      const updated = this.machine.getContext();
      this.speakCurrentSentence(updated);
    }
  }

  async nextChapter(): Promise<void> {
    const ctx = this.machine.getContext();
    Tts.stop();
    this.machine.send({ type: 'NEXT_CHAPTER', autoPlay: ctx.isPlaying });

    const newCtx = this.machine.getContext();
    await this.loadAndSpeakChapter(
      newCtx.currentChapterIndex,
      ctx.isPlaying
    );
  }

  async previousChapter(): Promise<void> {
    const ctx = this.machine.getContext();
    Tts.stop();
    this.machine.send({ type: 'PREVIOUS_CHAPTER' });

    const newCtx = this.machine.getContext();
    await this.loadAndSpeakChapter(newCtx.currentChapterIndex, false);
  }

  async seekTo(chapterIndex: number, sentenceIndex = 0): Promise<void> {
    const ctx = this.machine.getContext();
    Tts.stop();
    this.machine.send({ type: 'SEEK_CHAPTER', chapterIndex, sentenceIndex });

    await this.loadAndSpeakChapter(chapterIndex, false, sentenceIndex);
  }

  setSpeed(speed: number): void {
    this.machine.send({ type: 'SET_SPEED', speed: Math.max(0.5, Math.min(2.0, speed)) });
    this.emitSnapshot();
  }

  setPitch(pitch: number): void {
    this.machine.send({ type: 'SET_PITCH', pitch: Math.max(0.5, Math.min(2.0, pitch)) });
    this.emitSnapshot();
  }

  private speakCurrentSentence(ctx: ReturnType<PlaybackMachine['getContext']>): void {
    if (!ctx.isPlaying) return;
    if (ctx.currentSentenceIndex >= ctx.sentences.length) return;

    const sentence = ctx.sentences[ctx.currentSentenceIndex];
    if (!sentence) return;

    const previousSentences = ctx.sentences.slice(0, ctx.currentSentenceIndex);

    const arc = this.narrativeContext.processSentence(
      sentence.text,
      sentence.emotion as EmotionType,
      sentence.confidence
    );
    this.currentArc = arc;

    const classified = this.emotionEngine.classifyWithNarrativeContext(
      sentence.text,
      arc,
      previousSentences
    );

    const params = this.emotionEngine.getNarrationParams(
      classified.emotion,
      classified.intensity,
      ctx.speed,
      ctx.pitch
    );

    this.governor.publish('narration:speaking', {
      bookId: ctx.bookId,
      chapterIndex: ctx.currentChapterIndex,
      sentenceIndex: ctx.currentSentenceIndex,
      emotion: classified.emotion,
      confidence: classified.confidence,
      intensity: classified.intensity,
      arcPosition: arc.arcPosition,
      tension: arc.currentTension,
      pacing: arc.currentPacing,
      text: sentence.text,
    }, 'NarrationEngine', 'normal');

    Promise.all([
      Tts.setDefaultRate(Math.max(0.5, Math.min(2.0, params.speed))),
      Tts.setDefaultPitch(Math.max(0.5, Math.min(2.0, params.pitch))),
    ])
      .then(() => Tts.speak(sentence.text))
      .catch((e) => {
        console.error('[NarrationEngine] TTS speak error:', e);
        this.machine.send({
          type: 'TTS_ERROR',
          error: e instanceof Error ? e.message : 'TTS failed',
        });
      });
  }

  private async saveProgressQuiet(
    bookId: string,
    chapterIndex: number,
    sentenceIndex: number
  ): Promise<void> {
    try {
      await this.deps.saveProgress(bookId, chapterIndex, sentenceIndex);
    } catch (e) {
      console.error('[NarrationEngine] Failed to save progress:', e);
    }
  }

  subscribe(listener: SnapshotListener): () => void {
    this.snapshotListeners.add(listener);
    return () => this.snapshotListeners.delete(listener);
  }

  private emitSnapshot(): void {
    const ctx = this.machine.getContext();
    const currentSentence = ctx.sentences[ctx.currentSentenceIndex];

    const snapshot: NarrationSnapshot = {
      state: this.machine.getState(),
      bookId: ctx.bookId,
      chapterIndex: ctx.currentChapterIndex,
      sentenceIndex: ctx.currentSentenceIndex,
      sentences: ctx.sentences,
      chapters: ctx.chapters,
      speed: ctx.speed,
      pitch: ctx.pitch,
      isPlaying: ctx.isPlaying,
      currentEmotion: (currentSentence?.emotion as EmotionType) || 'neutral',
      currentText: currentSentence?.text || null,
    };

    for (const listener of this.snapshotListeners) {
      try {
        listener(snapshot);
      } catch (e) {
        console.error('[NarrationEngine] Snapshot listener error:', e);
      }
    }
  }

  send(event: PlaybackEvent): { accepted: boolean; reason?: string } {
    return this.machine.send(event);
  }

  destroy(): void {
    Tts.stop();
    if (this.ttsFinishHandler) {
      this.ttsFinishHandler();
    }
    if (this.ttsCancelHandler) {
      this.ttsCancelHandler();
    }
    this.snapshotListeners.clear();
    this.machine.reset();
  }
}
