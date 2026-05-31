export { PlaybackMachine } from './playback/PlaybackMachine';
export { EventGovernor } from './events/EventGovernor';
export { EmotionEngine } from './emotion/EmotionEngine';
export { NarrationEngine } from './narration/NarrationEngine';
export { NarrativeContextManager } from './narration/NarrativeContextManager';
export { NarrativeRhythmEngine } from './narration/NarrativeRhythmEngine';
export { NarrativeIdentityEngine } from './narration/NarrativeIdentityEngine';
export { NarrativeWeatherSystem } from './narration/NarrativeWeatherSystem';
export { SilenceArchitecture } from './narration/SilenceArchitecture';
export { EmotionalFatigueModel } from './narration/EmotionalFatigueModel';
export { EmotionalGravitySystem } from './narration/EmotionalGravitySystem';
export { StoryScarSystem } from './narration/StoryScarSystem';
export { MidnightModeManager } from './narration/MidnightModeManager';
export { LastPageExperience } from './narration/LastPageExperience';
export { CharacterVoiceRegistry } from './narration/CharacterVoiceRegistry';
export { CharacterPresenceLayer } from './narration/CharacterPresenceLayer';
export { SceneContinuity } from './narration/SceneContinuity';
export { NarrativeMemoryPersistence } from './narration/NarrativeMemoryPersistence';
export { BookIntelligenceLayer } from './narration/BookIntelligenceLayer';
export { ChunkedBookStore } from './storage/ChunkedBookStore';
export { OfflineNarrationCache } from './storage/OfflineNarrationCache';
export { AudioLayerManager } from './audio/AudioLayerManager';
export { NativeAudioService } from './audio/NativeAudioService';
export { NativeAudioRuntime, nativeAudioRuntime } from './audio/NativeAudioRuntime';
export { AmbientAudioEngine } from './audio/AmbientAudioEngine';
export { useNarration } from './useNarration';

export type {
  PlaybackState,
  PlaybackEvent,
  PlaybackContext,
  ChapterMeta,
  SentenceData,
  EmotionType,
  EmotionProfile,
  StateTransition,
} from './types';

export type { NarrationSnapshot } from './narration/NarrationEngine';

export type {
  SceneSnapshot,
  NarrativeArc,
} from './narration/NarrativeContextManager';

export type {
  RhythmSnapshot,
  RhythmConfig,
} from './narration/NarrativeRhythmEngine';

export type {
  NarrativeFingerprint,
  EmotionalSignature,
  PacingSignature,
  ThematicDensity,
  AtmosphericProfile,
  SilenceProfile as IdentitySilenceProfile,
  DialogueIntensity,
} from './narration/NarrativeIdentityEngine';

export type {
  WeatherState,
  AtmosphericDrift,
  NarrativeSeason,
} from './narration/NarrativeWeatherSystem';

export type {
  SilenceType,
  SilenceProfile,
  SilenceContext,
} from './narration/SilenceArchitecture';

export type {
  FatigueState,
} from './narration/EmotionalFatigueModel';

export type {
  GravityState,
  GravityModifier,
  StoryWeight,
} from './narration/EmotionalGravitySystem';

export type {
  StoryScar,
  ScarType,
} from './narration/StoryScarSystem';

export type {
  MidnightState,
} from './narration/MidnightModeManager';

export type {
  LastPageState,
} from './narration/LastPageExperience';

export type {
  CharacterProfile,
  VoiceModifiers,
  CharacterStats,
} from './narration/CharacterVoiceRegistry';

export type {
  PresenceIndicator,
  DialogueContext,
} from './narration/CharacterPresenceLayer';

export type {
  ContinuitySnapshot,
  ResumeContext,
} from './narration/SceneContinuity';

export type {
  NarrativeMemory,
  RestoreContext,
} from './narration/NarrativeMemoryPersistence';

export type {
  ChapterIntelligence,
  EmotionArcEntry,
  RelationshipMemory,
  BookTimeline,
} from './narration/BookIntelligenceLayer';

export type {
  AudioLayer,
  AudioLayerType,
  DuckingConfig,
} from './audio/AudioLayerManager';

export type {
  NativeAudioConfig,
  NativeAudioState,
  MediaMetadata,
  AudioFocusState,
  InterruptionType,
} from './audio/NativeAudioService';

export type {
  NativeAudioRuntimeConfig,
  MediaMetadataUpdate,
  PlaybackStateUpdate,
} from './audio/NativeAudioRuntime';

export type {
  AmbientSoundType,
  AmbientLayer,
  AmbientPreset,
} from './audio/AmbientAudioEngine';
