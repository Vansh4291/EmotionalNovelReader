import 'dart:async';
import 'package:audio_service/audio_service.dart';
import 'package:audio_session/audio_session.dart';

import '../../../../core/logging/app_logger.dart';
import '../../domain/entities/tts_entities.dart';
import '../../domain/services/tts_service.dart';

/// Single authoritative AudioHandler managing Android MediaSession, notification controls,
/// lock-screen metadata, sentence-level speech coordination, and audio focus transitions.
class TtsAudioHandler extends BaseAudioHandler with SeekHandler {
  TtsAudioHandler({
    required this.ttsService,
    required this.logger,
  }) {
    _init();
  }

  final TtsService ttsService;
  final AppLogger logger;

  List<TtsSentence> _sentences = const [];
  int _currentIndex = 0;
  String _bookId = '';
  String _bookTitle = '';
  String _chapterId = '';
  String _chapterTitle = '';
  double _rate = 1.0;
  double _pitch = 1.0;
  double _volume = 1.0;

  void Function(TtsSentence sentence)? onSentenceChanged;
  void Function()? onChapterCompleted;
  void Function(String error)? onError;

  List<TtsSentence> get sentences => _sentences;
  int get currentSentenceIndex => _currentIndex;
  TtsSentence? get currentSentence =>
      (_currentIndex >= 0 && _currentIndex < _sentences.length)
          ? _sentences[_currentIndex]
          : null;
  String get bookId => _bookId;
  String get chapterId => _chapterId;
  String get chapterTitle => _chapterTitle;
  double get rate => _rate;
  double get pitch => _pitch;
  double get volume => _volume;

  StreamSubscription<AudioInterruptionEvent>? _interruptionSub;

  void _init() {
    // Initial idle state
    playbackState.add(
      PlaybackState(
        controls: const [
          MediaControl.skipToPrevious,
          MediaControl.play,
          MediaControl.stop,
          MediaControl.skipToNext,
        ],
        systemActions: const {
          MediaAction.seek,
          MediaAction.seekForward,
          MediaAction.seekBackward,
        },
        androidCompactActionIndices: const [0, 1, 3],
        processingState: AudioProcessingState.idle,
        playing: false,
        updatePosition: Duration.zero,
      ),
    );

    ttsService.setCompletionHandler(() {
      _handleSpeechCompleted();
    });

    ttsService.setErrorHandler((error) {
      logger.error('TTS AudioHandler error: $error');
      onError?.call(error);
      playbackState.add(
        playbackState.value.copyWith(
          playing: false,
          processingState: AudioProcessingState.error,
          errorMessage: error,
        ),
      );
    });

    _configureAudioSession();
  }

  Future<void> _configureAudioSession() async {
    try {
      final session = await AudioSession.instance;
      await session.configure(const AudioSessionConfiguration.speech());

      _interruptionSub = session.interruptionEventStream.listen((event) {
        if (event.begin) {
          switch (event.type) {
            case AudioInterruptionType.duck:
              ttsService.setVolume(_volume * 0.4);
              break;
            case AudioInterruptionType.pause:
            case AudioInterruptionType.unknown:
              if (playbackState.value.playing) {
                pause();
              }
              break;
          }
        } else {
          switch (event.type) {
            case AudioInterruptionType.duck:
              ttsService.setVolume(_volume);
              break;
            case AudioInterruptionType.pause:
              play();
              break;
            case AudioInterruptionType.unknown:
              break;
          }
        }
      });
    } catch (_) {
      // AudioSession channels are unavailable in unit test environments or headless runners.
    }
  }

  void _updateMediaItem() {
    final sentence = currentSentence;
    mediaItem.add(
      MediaItem(
        id: '${_bookId}_${_chapterId}_$_currentIndex',
        album: _bookTitle.isNotEmpty ? _bookTitle : 'Emotional Novel Reader',
        title: _chapterTitle.isNotEmpty ? _chapterTitle : 'Reading Narration',
        artist: 'Voice Reader',
        displayTitle: _chapterTitle,
        displaySubtitle: sentence?.text ?? '',
        duration: null,
      ),
    );
  }

  void _updatePlaybackState({required bool isPlaying, AudioProcessingState? processingState}) {
    playbackState.add(
      playbackState.value.copyWith(
        controls: [
          MediaControl.skipToPrevious,
          if (isPlaying) MediaControl.pause else MediaControl.play,
          MediaControl.stop,
          MediaControl.skipToNext,
        ],
        androidCompactActionIndices: const [0, 1, 3],
        processingState: processingState ?? AudioProcessingState.ready,
        playing: isPlaying,
        speed: _rate,
        queueIndex: _currentIndex,
        updatePosition: Duration.zero,
      ),
    );
  }

  void setSentences(
    List<TtsSentence> sentences, {
    int initialIndex = 0,
    String bookId = '',
    String bookTitle = '',
    String chapterId = '',
    String chapterTitle = '',
  }) {
    _sentences = sentences;
    _currentIndex = (initialIndex >= 0 && initialIndex < sentences.length)
        ? initialIndex
        : 0;
    _bookId = bookId;
    _bookTitle = bookTitle;
    _chapterId = chapterId;
    _chapterTitle = chapterTitle;
    _updateMediaItem();
  }

  Future<void> loadChapter({
    required String bookId,
    required String bookTitle,
    required String chapterId,
    required String chapterTitle,
    required List<TtsSentence> sentences,
    int initialSentenceIndex = 0,
    bool autoPlay = false,
  }) async {
    await stop();

    _bookId = bookId;
    _bookTitle = bookTitle;
    _chapterId = chapterId;
    _chapterTitle = chapterTitle;
    _sentences = sentences;
    _currentIndex = (initialSentenceIndex >= 0 && initialSentenceIndex < sentences.length)
        ? initialSentenceIndex
        : 0;

    _updateMediaItem();
    _updatePlaybackState(isPlaying: false, processingState: AudioProcessingState.ready);

    final sentence = currentSentence;
    if (sentence != null) {
      onSentenceChanged?.call(sentence);
    }

    if (autoPlay && _sentences.isNotEmpty) {
      await play();
    }
  }

  @override
  Future<void> play() async {
    if (_sentences.isEmpty) return;
    final sentence = currentSentence;
    if (sentence == null) return;

    _updatePlaybackState(isPlaying: true);
    _updateMediaItem();
    onSentenceChanged?.call(sentence);

    await ttsService.setSpeechRate(_rate);
    await ttsService.setPitch(_pitch);
    await ttsService.setVolume(_volume);
    await ttsService.speak(sentence.text);
  }

  @override
  Future<void> pause() async {
    await ttsService.pause();
    _updatePlaybackState(isPlaying: false);
  }

  @override
  Future<void> stop() async {
    await ttsService.stop();
    _updatePlaybackState(isPlaying: false, processingState: AudioProcessingState.idle);
  }

  @override
  Future<void> skipToNext() async {
    if (_sentences.isEmpty) return;

    if (_currentIndex + 1 < _sentences.length) {
      _currentIndex++;
      _updateMediaItem();
      final sentence = currentSentence!;
      onSentenceChanged?.call(sentence);

      if (playbackState.value.playing) {
        await play();
      }
    } else {
      // Reached chapter end
      await stop();
      onChapterCompleted?.call();
    }
  }

  @override
  Future<void> skipToPrevious() async {
    if (_sentences.isEmpty) return;

    if (_currentIndex > 0) {
      _currentIndex--;
      _updateMediaItem();
      final sentence = currentSentence!;
      onSentenceChanged?.call(sentence);

      if (playbackState.value.playing) {
        await play();
      }
    }
  }

  Future<void> seekToSentence(int index) async {
    if (_sentences.isEmpty) return;
    _currentIndex = index.clamp(0, _sentences.length - 1);
    _updateMediaItem();
    final sentence = currentSentence;
    if (sentence != null) {
      onSentenceChanged?.call(sentence);
    }

    if (playbackState.value.playing) {
      await play();
    }
  }

  @override
  Future<void> setSpeed(double speed) async {
    _rate = speed;
    await ttsService.setSpeechRate(speed);
    _updatePlaybackState(isPlaying: playbackState.value.playing);
  }

  Future<void> setPitch(double pitch) async {
    _pitch = pitch;
    await ttsService.setPitch(pitch);
  }

  Future<void> setVolume(double volume) async {
    _volume = volume;
    await ttsService.setVolume(volume);
  }

  void _handleSpeechCompleted() {
    if (playbackState.value.playing) {
      skipToNext();
    }
  }

  void dispose() {
    _interruptionSub?.cancel();
    stop();
  }
}
