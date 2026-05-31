export type PlaybackState =
  | 'IDLE'
  | 'LOADING_BOOK'
  | 'READY'
  | 'BUFFERING'
  | 'PLAYING'
  | 'PAUSED'
  | 'TRANSITIONING_CHAPTER'
  | 'INTERRUPTED'
  | 'ERROR'
  | 'RECOVERING'
  | 'STOPPED';

export type PlaybackEvent =
  | { type: 'LOAD_BOOK'; bookId: string; chapterIndex?: number; sentenceIndex?: number }
  | { type: 'BOOK_LOADED'; chapters: ChapterMeta[] }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'STOP' }
  | { type: 'NEXT_SENTENCE' }
  | { type: 'PREVIOUS_SENTENCE' }
  | { type: 'NEXT_CHAPTER'; autoPlay?: boolean }
  | { type: 'PREVIOUS_CHAPTER' }
  | { type: 'SEEK_CHAPTER'; chapterIndex: number; sentenceIndex?: number }
  | { type: 'TTS_FINISH' }
  | { type: 'TTS_CANCEL' }
  | { type: 'TTS_ERROR'; error: string }
  | { type: 'AUDIO_INTERRUPTION'; reason: 'focus_lost' | 'phone_call' | 'bluetooth_disconnect' }
  | { type: 'AUDIO_INTERRUPTION_END' }
  | { type: 'CHAPTER_LOADED'; chapterIndex: number; sentences: SentenceData[] }
  | { type: 'ERROR_THROWN'; error: string }
  | { type: 'RECOVER' }
  | { type: 'SLEEP_TIMER_EXPIRED' }
  | { type: 'SET_SPEED'; speed: number }
  | { type: 'SET_PITCH'; pitch: number };

export interface ChapterMeta {
  index: number;
  title: string;
  wordCount: number;
  isAnalyzed: boolean;
}

export interface SentenceData {
  index: number;
  text: string;
  emotion: EmotionType;
  confidence: number;
  startChar: number;
  endChar: number;
}

export type EmotionType =
  | 'joy'
  | 'sadness'
  | 'anger'
  | 'fear'
  | 'surprise'
  | 'neutral';

export interface EmotionProfile {
  speed: number;
  pitch: number;
  pauseAfterMs?: number;
  volume?: number;
}

export interface PlaybackContext {
  bookId: string;
  chapters: ChapterMeta[];
  currentChapterIndex: number;
  currentSentenceIndex: number;
  sentences: SentenceData[];
  speed: number;
  pitch: number;
  isPlaying: boolean;
  loading: boolean;
  error: string | null;
}

export type StateTransition = {
  from: PlaybackState;
  event: PlaybackEvent['type'];
  to: PlaybackState;
  guard?: (ctx: PlaybackContext) => boolean;
  action?: (ctx: PlaybackContext, event: PlaybackEvent) => Partial<PlaybackContext>;
};
