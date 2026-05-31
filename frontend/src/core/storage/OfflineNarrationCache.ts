import { EmotionType } from '../types';
import { EventGovernor } from '../events/EventGovernor';

interface EmotionCacheEntry {
  textHash: string;
  emotion: EmotionType;
  confidence: number;
  intensity: number;
  timestamp: number;
  hits: number;
}

interface VoiceParamsCacheEntry {
  emotion: EmotionType;
  speed: number;
  pitch: number;
  pauseAfterMs: number;
  timestamp: number;
}

interface SceneCacheEntry {
  sceneIndex: number;
  tension: number;
  pacing: number;
  dominantEmotion: EmotionType;
  timestamp: number;
}

const MAX_EMOTION_CACHE = 2000;
const MAX_VOICE_CACHE = 500;
const MAX_SCENE_CACHE = 100;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class OfflineNarrationCache {
  private emotionCache: Map<string, EmotionCacheEntry> = new Map();
  private voiceCache: Map<string, VoiceParamsCacheEntry> = new Map();
  private sceneCache: SceneCacheEntry[] = [];
  private governor: EventGovernor;

  constructor(governor: EventGovernor) {
    this.governor = governor;
  }

  getEmotion(text: string): { emotion: EmotionType; confidence: number; intensity: number } | null {
    const hash = this.hashText(text);
    const entry = this.emotionCache.get(hash);

    if (!entry) return null;

    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.emotionCache.delete(hash);
      return null;
    }

    entry.hits += 1;
    return {
      emotion: entry.emotion,
      confidence: entry.confidence,
      intensity: entry.intensity,
    };
  }

  setEmotion(
    text: string,
    emotion: EmotionType,
    confidence: number,
    intensity: number
  ): void {
    const hash = this.hashText(text);

    if (this.emotionCache.size >= MAX_EMOTION_CACHE) {
      this.evictEmotionCache();
    }

    this.emotionCache.set(hash, {
      textHash: hash,
      emotion,
      confidence,
      intensity,
      timestamp: Date.now(),
      hits: 0,
    });

    this.governor.publish('cache:emotion_stored', {
      hash,
      emotion,
      cacheSize: this.emotionCache.size,
    }, 'OfflineNarrationCache', 'low');
  }

  getVoiceParams(
    emotion: EmotionType,
    speed: number,
    pitch: number
  ): { pauseAfterMs: number } | null {
    const key = this.buildVoiceKey(emotion, speed, pitch);
    const entry = this.voiceCache.get(key);

    if (!entry) return null;

    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.voiceCache.delete(key);
      return null;
    }

    return { pauseAfterMs: entry.pauseAfterMs };
  }

  setVoiceParams(
    emotion: EmotionType,
    speed: number,
    pitch: number,
    pauseAfterMs: number
  ): void {
    const key = this.buildVoiceKey(emotion, speed, pitch);

    if (this.voiceCache.size >= MAX_VOICE_CACHE) {
      this.evictVoiceCache();
    }

    this.voiceCache.set(key, {
      emotion,
      speed,
      pitch,
      pauseAfterMs,
      timestamp: Date.now(),
    });
  }

  getScene(sceneIndex: number): SceneCacheEntry | null {
    return this.sceneCache.find((s) => s.sceneIndex === sceneIndex) || null;
  }

  setScene(
    sceneIndex: number,
    tension: number,
    pacing: number,
    dominantEmotion: EmotionType
  ): void {
    const existing = this.sceneCache.findIndex(
      (s) => s.sceneIndex === sceneIndex
    );

    const entry: SceneCacheEntry = {
      sceneIndex,
      tension,
      pacing,
      dominantEmotion,
      timestamp: Date.now(),
    };

    if (existing >= 0) {
      this.sceneCache[existing] = entry;
    } else {
      if (this.sceneCache.length >= MAX_SCENE_CACHE) {
        this.sceneCache.shift();
      }
      this.sceneCache.push(entry);
    }
  }

  private evictEmotionCache(): void {
    const entries = Array.from(this.emotionCache.entries());
    entries.sort((a, b) => {
      const aAge = Date.now() - a[1].timestamp;
      const bAge = Date.now() - b[1].timestamp;
      const aScore = a[1].hits / (aAge / 3600000 + 1);
      const bScore = b[1].hits / (bAge / 3600000 + 1);
      return aScore - bScore;
    });

    const toRemove = Math.floor(MAX_EMOTION_CACHE * 0.2);
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.emotionCache.delete(entries[i][0]);
    }
  }

  private evictVoiceCache(): void {
    const entries = Array.from(this.voiceCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = Math.floor(MAX_VOICE_CACHE * 0.2);
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.voiceCache.delete(entries[i][0]);
    }
  }

  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return `h_${hash.toString(36)}`;
  }

  private buildVoiceKey(
    emotion: EmotionType,
    speed: number,
    pitch: number
  ): string {
    return `${emotion}_${speed.toFixed(2)}_${pitch.toFixed(2)}`;
  }

  getEmotionCacheSize(): number {
    return this.emotionCache.size;
  }

  getVoiceCacheSize(): number {
    return this.voiceCache.size;
  }

  getSceneCacheSize(): number {
    return this.sceneCache.length;
  }

  getEmotionHitRate(): number {
    let totalHits = 0;
    let totalEntries = 0;
    for (const entry of this.emotionCache.values()) {
      totalHits += entry.hits;
      totalEntries += 1;
    }
    return totalEntries > 0 ? totalHits / totalEntries : 0;
  }

  clear(): void {
    this.emotionCache.clear();
    this.voiceCache.clear();
    this.sceneCache = [];
  }

  destroy(): void {
    this.clear();
  }
}
