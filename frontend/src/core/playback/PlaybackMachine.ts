import {
  PlaybackState,
  PlaybackEvent,
  PlaybackContext,
  StateTransition,
} from '../types';

const TRANSITIONS: StateTransition[] = [
  { from: 'IDLE', event: 'LOAD_BOOK', to: 'LOADING_BOOK' },
  { from: 'LOADING_BOOK', event: 'BOOK_LOADED', to: 'READY' },
  { from: 'LOADING_BOOK', event: 'ERROR_THROWN', to: 'ERROR' },

  { from: 'READY', event: 'PLAY', to: 'PLAYING' },
  { from: 'READY', event: 'NEXT_SENTENCE', to: 'PLAYING' },
  { from: 'READY', event: 'NEXT_CHAPTER', to: 'TRANSITIONING_CHAPTER' },

  { from: 'PLAYING', event: 'PAUSE', to: 'PAUSED' },
  { from: 'PLAYING', event: 'STOP', to: 'STOPPED' },
  { from: 'PLAYING', event: 'TTS_FINISH', to: 'PLAYING' },
  { from: 'PLAYING', event: 'TTS_CANCEL', to: 'PAUSED' },
  { from: 'PLAYING', event: 'TTS_ERROR', to: 'ERROR' },
  { from: 'PLAYING', event: 'NEXT_SENTENCE', to: 'PLAYING' },
  { from: 'PLAYING', event: 'PREVIOUS_SENTENCE', to: 'PLAYING' },
  { from: 'PLAYING', event: 'NEXT_CHAPTER', to: 'TRANSITIONING_CHAPTER' },
  { from: 'PLAYING', event: 'PREVIOUS_CHAPTER', to: 'TRANSITIONING_CHAPTER' },
  { from: 'PLAYING', event: 'SEEK_CHAPTER', to: 'TRANSITIONING_CHAPTER' },
  { from: 'PLAYING', event: 'AUDIO_INTERRUPTION', to: 'INTERRUPTED' },
  { from: 'PLAYING', event: 'SLEEP_TIMER_EXPIRED', to: 'PAUSED' },

  { from: 'PAUSED', event: 'PLAY', to: 'PLAYING' },
  { from: 'PAUSED', event: 'STOP', to: 'STOPPED' },
  { from: 'PAUSED', event: 'NEXT_SENTENCE', to: 'PLAYING' },
  { from: 'PAUSED', event: 'NEXT_CHAPTER', to: 'TRANSITIONING_CHAPTER' },
  { from: 'PAUSED', event: 'SEEK_CHAPTER', to: 'TRANSITIONING_CHAPTER' },

  { from: 'TRANSITIONING_CHAPTER', event: 'CHAPTER_LOADED', to: 'READY' },
  { from: 'TRANSITIONING_CHAPTER', event: 'ERROR_THROWN', to: 'ERROR' },
  { from: 'TRANSITIONING_CHAPTER', event: 'STOP', to: 'STOPPED' },

  { from: 'INTERRUPTED', event: 'AUDIO_INTERRUPTION_END', to: 'PLAYING' },
  { from: 'INTERRUPTED', event: 'STOP', to: 'STOPPED' },
  { from: 'INTERRUPTED', event: 'PLAY', to: 'PLAYING' },

  { from: 'ERROR', event: 'RECOVER', to: 'RECOVERING' },
  { from: 'ERROR', event: 'STOP', to: 'STOPPED' },
  { from: 'ERROR', event: 'LOAD_BOOK', to: 'LOADING_BOOK' },

  { from: 'RECOVERING', event: 'BOOK_LOADED', to: 'READY' },
  { from: 'RECOVERING', event: 'ERROR_THROWN', to: 'ERROR' },

  { from: 'STOPPED', event: 'LOAD_BOOK', to: 'LOADING_BOOK' },
  { from: 'STOPPED', event: 'PLAY', to: 'IDLE' },
];

type Listener = (state: PlaybackState, context: PlaybackContext) => void;

export class PlaybackMachine {
  private state: PlaybackState = 'IDLE';
  private context: PlaybackContext;
  private listeners: Set<Listener> = new Set();
  private transitionTable: Map<string, StateTransition>;
  private history: Array<{ state: PlaybackState; event: PlaybackEvent['type']; timestamp: number }> = [];
  private maxHistory = 50;

  constructor(initialContext: Partial<PlaybackContext> = {}) {
    this.context = {
      bookId: '',
      chapters: [],
      currentChapterIndex: 0,
      currentSentenceIndex: 0,
      sentences: [],
      speed: 1.0,
      pitch: 1.0,
      isPlaying: false,
      loading: false,
      error: null,
      ...initialContext,
    };

    this.transitionTable = new Map();
    for (const t of TRANSITIONS) {
      const key = `${t.from}:${t.event}`;
      this.transitionTable.set(key, t);
    }
  }

  getState(): PlaybackState {
    return this.state;
  }

  getContext(): Readonly<PlaybackContext> {
    return this.context;
  }

  canAccept(event: PlaybackEvent['type']): boolean {
    const key = `${this.state}:${event}`;
    return this.transitionTable.has(key);
  }

  send(event: PlaybackEvent): { accepted: boolean; newState?: PlaybackState; reason?: string } {
    const key = `${this.state}:${event.type}`;
    const transition = this.transitionTable.get(key);

    if (!transition) {
      const reason = `No transition for ${event.type} in state ${this.state}`;
      console.warn(`[PlaybackMachine] ${reason}`);
      return { accepted: false, reason };
    }

    if (transition.guard && !transition.guard(this.context)) {
      const reason = `Guard rejected ${event.type} in state ${this.state}`;
      console.warn(`[PlaybackMachine] ${reason}`);
      return { accepted: false, reason };
    }

    const previousState = this.state;

    if (transition.action) {
      const patch = transition.action(this.context, event);
      this.context = { ...this.context, ...patch };
    }

    this.applyEventToContext(event);
    this.state = transition.to;

    this.history.push({
      state: this.state,
      event: event.type,
      timestamp: Date.now(),
    });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this.notifyListeners(previousState);

    return { accepted: true, newState: this.state };
  }

  private applyEventToContext(event: PlaybackEvent): void {
    switch (event.type) {
      case 'LOAD_BOOK':
        this.context.bookId = event.bookId;
        this.context.loading = true;
        this.context.error = null;
        if (event.chapterIndex !== undefined) {
          this.context.currentChapterIndex = event.chapterIndex;
        }
        if (event.sentenceIndex !== undefined) {
          this.context.currentSentenceIndex = event.sentenceIndex;
        }
        break;

      case 'BOOK_LOADED':
        this.context.chapters = event.chapters;
        this.context.loading = false;
        break;

      case 'PLAY':
        this.context.isPlaying = true;
        this.context.error = null;
        break;

      case 'PAUSE':
        this.context.isPlaying = false;
        break;

      case 'STOP':
        this.context.isPlaying = false;
        this.context.currentSentenceIndex = 0;
        break;

      case 'NEXT_SENTENCE':
        if (this.context.currentSentenceIndex < this.context.sentences.length - 1) {
          this.context.currentSentenceIndex += 1;
        }
        break;

      case 'PREVIOUS_SENTENCE':
        if (this.context.currentSentenceIndex > 0) {
          this.context.currentSentenceIndex -= 1;
        }
        break;

      case 'NEXT_CHAPTER':
        if (this.context.currentChapterIndex < this.context.chapters.length - 1) {
          this.context.currentChapterIndex += 1;
          this.context.currentSentenceIndex = 0;
        }
        break;

      case 'PREVIOUS_CHAPTER':
        if (this.context.currentChapterIndex > 0) {
          this.context.currentChapterIndex -= 1;
          this.context.currentSentenceIndex = 0;
        }
        break;

      case 'SEEK_CHAPTER':
        this.context.currentChapterIndex = event.chapterIndex;
        this.context.currentSentenceIndex = event.sentenceIndex ?? 0;
        break;

      case 'CHAPTER_LOADED':
        this.context.sentences = event.sentences;
        this.context.currentChapterIndex = event.chapterIndex;
        break;

      case 'TTS_FINISH':
        break;

      case 'TTS_CANCEL':
        this.context.isPlaying = false;
        break;

      case 'TTS_ERROR':
        this.context.error = event.error;
        this.context.isPlaying = false;
        break;

      case 'AUDIO_INTERRUPTION':
        this.context.isPlaying = false;
        break;

      case 'AUDIO_INTERRUPTION_END':
        this.context.isPlaying = true;
        break;

      case 'ERROR_THROWN':
        this.context.error = event.error;
        this.context.loading = false;
        this.context.isPlaying = false;
        break;

      case 'SET_SPEED':
        this.context.speed = event.speed;
        break;

      case 'SET_PITCH':
        this.context.pitch = event.pitch;
        break;

      case 'SLEEP_TIMER_EXPIRED':
        this.context.isPlaying = false;
        break;
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(previousState: PlaybackState): void {
    for (const listener of this.listeners) {
      try {
        listener(this.state, this.context);
      } catch (e) {
        console.error('[PlaybackMachine] Listener error:', e);
      }
    }
  }

  getHistory(): ReadonlyArray<{ state: PlaybackState; event: PlaybackEvent['type']; timestamp: number }> {
    return this.history;
  }

  reset(): void {
    this.state = 'IDLE';
    this.context = {
      bookId: '',
      chapters: [],
      currentChapterIndex: 0,
      currentSentenceIndex: 0,
      sentences: [],
      speed: 1.0,
      pitch: 1.0,
      isPlaying: false,
      loading: false,
      error: null,
    };
    this.history = [];
    this.notifyListeners('IDLE');
  }
}
