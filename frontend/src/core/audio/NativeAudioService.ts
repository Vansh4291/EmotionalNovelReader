export type AudioFocusState =
  | 'focused'
  | 'ducked'
  | 'lost'
  | 'lost_transient'
  | 'lost_transient_can_duck';

export type InterruptionType =
  | 'phone_call'
  | 'notification'
  | 'alarm'
  | 'bluetooth_disconnect'
  | 'headphone_unplug'
  | 'other_app';

export interface NativeAudioConfig {
  enableMediaSession: boolean;
  enableLockscreenControls: boolean;
  enableBluetoothControls: boolean;
  enableAudioFocus: boolean;
  notificationChannelId: string;
  notificationChannelName: string;
  notificationIcon: string;
  foregroundServiceType: string;
}

export interface MediaMetadata {
  title: string;
  artist: string;
  album: string;
  duration: number;
  chapterIndex: number;
  bookId: string;
}

export interface PlaybackPosition {
  position: number;
  duration: number;
  speed: number;
}

export interface NativeAudioState {
  isPlaying: boolean;
  isPaused: boolean;
  audioFocus: AudioFocusState;
  isBluetoothConnected: boolean;
  isHeadphonePlugged: boolean;
  isForegroundServiceRunning: boolean;
  currentPosition: number;
  duration: number;
}

type NativeAudioCallback = (event: string, data?: unknown) => void;

const DEFAULT_CONFIG: NativeAudioConfig = {
  enableMediaSession: true,
  enableLockscreenControls: true,
  enableBluetoothControls: true,
  enableAudioFocus: true,
  notificationChannelId: 'enr_narration',
  notificationChannelName: 'Narration',
  notificationIcon: 'ic_narration',
  foregroundServiceType: 'mediaPlayback',
};

export class NativeAudioService {
  private config: NativeAudioConfig;
  private listeners: Set<NativeAudioCallback> = new Set();
  private state: NativeAudioState = {
    isPlaying: false,
    isPaused: false,
    audioFocus: 'focused',
    isBluetoothConnected: false,
    isHeadphonePlugged: false,
    isForegroundServiceRunning: false,
    currentPosition: 0,
    duration: 0,
  };

  constructor(config: Partial<NativeAudioConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async initialize(): Promise<boolean> {
    try {
      this.emit('initialized', this.config);
      return true;
    } catch (e) {
      console.error('[NativeAudioService] Init failed:', e);
      return false;
    }
  }

  async startForeground(metadata: MediaMetadata): Promise<void> {
    this.state.isForegroundServiceRunning = true;
    this.emit('foreground_started', metadata);
  }

  async stopForeground(): Promise<void> {
    this.state.isForegroundServiceRunning = false;
    this.emit('foreground_stopped');
  }

  async updateMediaMetadata(metadata: MediaMetadata): Promise<void> {
    this.emit('metadata_updated', metadata);
  }

  async updatePlaybackPosition(position: PlaybackPosition): Promise<void> {
    this.state.currentPosition = position.position;
    this.state.duration = position.duration;
    this.emit('position_updated', position);
  }

  async requestAudioFocus(): Promise<AudioFocusState> {
    if (!this.config.enableAudioFocus) {
      return 'focused';
    }

    this.state.audioFocus = 'focused';
    this.emit('audio_focus_changed', this.state.audioFocus);
    return this.state.audioFocus;
  }

  async abandonAudioFocus(): Promise<void> {
    this.state.audioFocus = 'lost';
    this.emit('audio_focus_changed', this.state.audioFocus);
  }

  handleAudioFocusChange(focusState: AudioFocusState): void {
    this.state.audioFocus = focusState;

    switch (focusState) {
      case 'lost':
        this.state.isPlaying = false;
        this.state.isPaused = true;
        this.emit('playback_paused', { reason: 'audio_focus_lost' });
        break;

      case 'lost_transient':
        this.state.isPlaying = false;
        this.state.isPaused = true;
        this.emit('playback_paused', { reason: 'audio_focus_lost_transient' });
        break;

      case 'lost_transient_can_duck':
        this.emit('volume_ducked', { duckLevel: 0.3 });
        break;

      case 'ducked':
        this.emit('volume_ducked', { duckLevel: 0.5 });
        break;

      case 'focused':
        this.emit('audio_focus_regained');
        break;
    }

    this.emit('audio_focus_changed', focusState);
  }

  handleInterruption(type: InterruptionType): void {
    this.state.isPlaying = false;
    this.state.isPaused = true;

    this.emit('interruption', { type });
    this.emit('playback_paused', { reason: type });
  }

  handleBluetoothConnect(): void {
    this.state.isBluetoothConnected = true;
    this.emit('bluetooth_connected');
  }

  handleBluetoothDisconnect(): void {
    this.state.isBluetoothConnected = false;
    this.emit('bluetooth_disconnected');
    this.emit('interruption', { type: 'bluetooth_disconnect' });
  }

  handleHeadphonePlug(): void {
    this.state.isHeadphonePlugged = true;
    this.emit('headphone_plugged');
  }

  handleHeadphoneUnplug(): void {
    this.state.isHeadphonePlugged = false;
    this.emit('headphone_unplugged');
    this.emit('interruption', { type: 'headphone_unplug' });
  }

  getState(): Readonly<NativeAudioState> {
    return { ...this.state };
  }

  getConfig(): Readonly<NativeAudioConfig> {
    return this.config;
  }

  subscribe(callback: NativeAudioCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private emit(event: string, data?: unknown): void {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch (e) {
        console.error('[NativeAudioService] Listener error:', e);
      }
    }
  }

  destroy(): void {
    this.listeners.clear();
    this.state = {
      isPlaying: false,
      isPaused: false,
      audioFocus: 'lost',
      isBluetoothConnected: false,
      isHeadphonePlugged: false,
      isForegroundServiceRunning: false,
      currentPosition: 0,
      duration: 0,
    };
  }
}
