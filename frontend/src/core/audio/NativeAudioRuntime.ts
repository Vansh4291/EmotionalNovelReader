import { NativeModules, Platform, NativeEventEmitter } from 'react-native';

export interface NativeAudioRuntimeConfig {
  enableMediaSession: boolean;
  enableLockscreenControls: boolean;
  enableBluetoothAVRCP: boolean;
  enableAudioFocus: boolean;
  enableForegroundService: boolean;
  notificationChannelId: string;
  notificationTitle: string;
  wakeLockMode: 'none' | 'partial' | 'full';
}

export interface MediaMetadataUpdate {
  title: string;
  artist: string;
  album: string;
  duration: number;
  chapterIndex: number;
  bookId: string;
}

export interface PlaybackStateUpdate {
  state: 'playing' | 'paused' | 'buffering' | 'idle';
  position: number;
  duration: number;
  speed: number;
}

export type AudioFocusEvent =
  | 'focused'
  | 'lost'
  | 'lost_transient'
  | 'lost_transient_can_duck';

export type InterruptionEvent =
  | 'phone_call'
  | 'notification'
  | 'alarm'
  | 'bluetooth_disconnect'
  | 'headphone_unplug'
  | 'audio_becoming_noisy';

interface NativeAudioModule {
  initialize(config: NativeAudioRuntimeConfig): Promise<boolean>;
  startForeground(metadata: MediaMetadataUpdate): Promise<void>;
  stopForeground(): Promise<void>;
  updateMetadata(metadata: MediaMetadataUpdate): Promise<void>;
  updatePlaybackState(state: PlaybackStateUpdate): Promise<void>;
  requestAudioFocus(): Promise<AudioFocusEvent>;
  abandonAudioFocus(): Promise<void>;
  acquireWakeLock(mode: 'partial' | 'full'): Promise<void>;
  releaseWakeLock(): Promise<void>;
  isBluetoothConnected(): Promise<boolean>;
  isHeadphonePlugged(): Promise<boolean>;
  setNotificationVisible(visible: boolean): Promise<void>;
  addListener(event: string, callback: (...args: unknown[]) => void): void;
  removeListeners(count: number): void;
}

const LINKING_ERROR =
  `The package 'emotional-novel-reader' doesn't seem to be linked. Make sure:\n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go (custom dev client required)';

const isTurboModuleEnabled = (global as Record<string, unknown>).__turboModuleProxy != null;

const AudioRuntimeModule: NativeAudioModule = isTurboModuleEnabled
  ? require('NativeENRAudioRuntime').default
  : NativeModules.ENRAudioRuntime
    ? NativeModules.ENRAudioRuntime
    : new Proxy(
        {} as NativeAudioModule,
        {
          get() {
            throw new Error(LINKING_ERROR);
          },
        }
      );

export class NativeAudioRuntime {
  private module: NativeAudioModule;
  private eventEmitter: NativeEventEmitter | null = null;
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private initialized = false;

  constructor() {
    this.module = AudioRuntimeModule;
  }

  async initialize(config: NativeAudioRuntimeConfig): Promise<boolean> {
    if (this.initialized) return true;

    try {
      const result = await this.module.initialize(config);
      this.initialized = result;

      if (result) {
        this.eventEmitter = new NativeEventEmitter(this.module as unknown as never);
        this.setupEventForwarding();
      }

      return result;
    } catch (e) {
      console.error('[NativeAudioRuntime] Init failed:', e);
      return false;
    }
  }

  private setupEventForwarding(): void {
    const events = [
      'onAudioFocusChange',
      'onBluetoothConnect',
      'onBluetoothDisconnect',
      'onHeadphonePlug',
      'onHeadphoneUnplug',
      'onAudioBecomingNoisy',
      'onMediaButtonPlay',
      'onMediaButtonPause',
      'onMediaButtonNext',
      'onMediaButtonPrevious',
      'onMediaButtonStop',
      'onNotificationPlay',
      'onNotificationPause',
      'onNotificationNext',
      'onNotificationPrevious',
      'onNotificationStop',
    ];

    for (const event of events) {
      this.eventEmitter?.addListener(event, (...args: unknown[]) => {
        this.emit(event, ...args);
      });
    }
  }

  async startForeground(metadata: MediaMetadataUpdate): Promise<void> {
    return this.module.startForeground(metadata);
  }

  async stopForeground(): Promise<void> {
    return this.module.stopForeground();
  }

  async updateMetadata(metadata: MediaMetadataUpdate): Promise<void> {
    return this.module.updateMetadata(metadata);
  }

  async updatePlaybackState(state: PlaybackStateUpdate): Promise<void> {
    return this.module.updatePlaybackState(state);
  }

  async requestAudioFocus(): Promise<AudioFocusEvent> {
    return this.module.requestAudioFocus();
  }

  async abandonAudioFocus(): Promise<void> {
    return this.module.abandonAudioFocus();
  }

  async acquireWakeLock(mode: 'partial' | 'full' = 'partial'): Promise<void> {
    return this.module.acquireWakeLock(mode);
  }

  async releaseWakeLock(): Promise<void> {
    return this.module.releaseWakeLock();
  }

  async isBluetoothConnected(): Promise<boolean> {
    return this.module.isBluetoothConnected();
  }

  async isHeadphonePlugged(): Promise<boolean> {
    return this.module.isHeadphonePlugged();
  }

  on(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (...args: unknown[]) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, ...args: unknown[]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(...args);
        } catch (e) {
          console.error(`[NativeAudioRuntime] Event handler error for ${event}:`, e);
        }
      }
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  destroy(): void {
    this.module.releaseWakeLock().catch(() => {});
    this.module.abandonAudioFocus().catch(() => {});
    this.module.stopForeground().catch(() => {});
    this.listeners.clear();
    this.initialized = false;
  }
}

export const nativeAudioRuntime = new NativeAudioRuntime();
