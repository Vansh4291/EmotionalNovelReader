import 'dart:async';
import 'package:audio_service/audio_service.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/logging/app_logger.dart';
import '../../data/services/tts_audio_handler.dart';
import '../../domain/entities/tts_entities.dart';
import '../../domain/services/tts_service.dart';
import '../../domain/services/tts_text_parser.dart';
import 'tts_state.dart';

typedef TtsSentenceChangeCallback = void Function(TtsSentence sentence);
typedef TtsChapterCompletedCallback = void Function();

class TtsCubit extends Cubit<TtsState> {
  TtsCubit({
    required this.ttsService,
    TtsAudioHandler? audioHandler,
    this.textParser = const TtsTextParser(),
    required this.logger,
  })  : _audioHandler = audioHandler ??
            TtsAudioHandler(ttsService: ttsService, logger: logger),
        super(const TtsState()) {
    _bindHandlers();
  }

  final TtsService ttsService;
  final TtsAudioHandler _audioHandler;
  final TtsTextParser textParser;
  final AppLogger logger;

  TtsAudioHandler get audioHandler => _audioHandler;

  TtsSentenceChangeCallback? onSentenceChanged;
  TtsChapterCompletedCallback? onChapterCompleted;

  StreamSubscription<PlaybackState>? _playbackSub;

  void _bindHandlers() {
    _audioHandler.onSentenceChanged = (sentence) {
      if (state.currentSentenceIndex != _audioHandler.currentSentenceIndex) {
        emit(
          state.copyWith(
            currentSentenceIndex: _audioHandler.currentSentenceIndex,
          ),
        );
      }
      onSentenceChanged?.call(sentence);
    };

    _audioHandler.onChapterCompleted = () {
      emit(state.copyWith(status: TtsPlaybackStatus.stopped));
      onChapterCompleted?.call();
    };

    _audioHandler.onError = (error) {
      emit(
        state.copyWith(
          status: TtsPlaybackStatus.stopped,
          errorMessage: error,
        ),
      );
    };

    _playbackSub = _audioHandler.playbackState.skip(1).listen((ps) {
      if (ps.errorMessage != null && ps.errorMessage!.isNotEmpty) {
        emit(
          state.copyWith(
            status: TtsPlaybackStatus.stopped,
            errorMessage: ps.errorMessage,
          ),
        );
        return;
      }
      if (ps.playing && state.status != TtsPlaybackStatus.playing) {
        emit(state.copyWith(status: TtsPlaybackStatus.playing));
      } else if (!ps.playing && state.status == TtsPlaybackStatus.playing) {
        final newStatus = ps.processingState == AudioProcessingState.idle
            ? TtsPlaybackStatus.stopped
            : TtsPlaybackStatus.paused;
        emit(state.copyWith(status: newStatus));
      }
    });
  }

  Future<void> initialize() async {
    final success = await ttsService.initialize();
    if (!success) {
      emit(
        state.copyWith(errorMessage: 'Could not initialize system TTS engine'),
      );
      return;
    }

    final langs = await ttsService.getAvailableLanguages();
    final engines = await ttsService.getAvailableEngines();

    emit(state.copyWith(availableLanguages: langs, availableEngines: engines));
  }

  Future<void> loadChapter({
    required String bookId,
    String bookTitle = '',
    required String chapterId,
    required String chapterTitle,
    required String content,
    int initialSentenceIndex = 0,
    bool autoPlay = false,
  }) async {
    await stop();

    final sentences = textParser.parseSentences(content);
    final validIndex =
        (initialSentenceIndex >= 0 && initialSentenceIndex < sentences.length)
            ? initialSentenceIndex
            : 0;

    emit(
      state.copyWith(
        bookId: bookId,
        bookTitle: bookTitle,
        chapterId: chapterId,
        chapterTitle: chapterTitle,
        sentences: sentences,
        currentSentenceIndex: validIndex,
        status: TtsPlaybackStatus.stopped,
        clearError: true,
      ),
    );

    await _audioHandler.loadChapter(
      bookId: bookId,
      bookTitle: bookTitle,
      chapterId: chapterId,
      chapterTitle: chapterTitle,
      sentences: sentences,
      initialSentenceIndex: validIndex,
      autoPlay: autoPlay,
    );
  }

  Future<void> play() async {
    if (state.sentences.isEmpty) return;
    final sentence = state.currentSentence;
    if (sentence == null) return;

    emit(state.copyWith(status: TtsPlaybackStatus.playing, clearError: true));
    onSentenceChanged?.call(sentence);

    if (_audioHandler.sentences.isEmpty && state.sentences.isNotEmpty) {
      _audioHandler.setSentences(
        state.sentences,
        initialIndex: state.currentSentenceIndex,
        bookId: state.bookId ?? '',
        bookTitle: state.bookTitle,
        chapterId: state.chapterId ?? '',
        chapterTitle: state.chapterTitle,
      );
    }

    await _audioHandler.play();
  }

  Future<void> pause() async {
    if (state.status != TtsPlaybackStatus.playing) return;
    await _audioHandler.pause();
    emit(state.copyWith(status: TtsPlaybackStatus.paused));
  }

  Future<void> resume() async {
    if (state.status != TtsPlaybackStatus.paused) return;
    await play();
  }

  Future<void> stop() async {
    await _audioHandler.stop();
    emit(state.copyWith(status: TtsPlaybackStatus.stopped));
  }

  Future<void> nextSentence() async {
    await _audioHandler.skipToNext();
    emit(
      state.copyWith(
        currentSentenceIndex: _audioHandler.currentSentenceIndex,
      ),
    );
  }

  Future<void> previousSentence() async {
    await _audioHandler.skipToPrevious();
    emit(
      state.copyWith(
        currentSentenceIndex: _audioHandler.currentSentenceIndex,
      ),
    );
  }

  Future<void> seekToSentence(int index) async {
    await _audioHandler.seekToSentence(index);
    emit(
      state.copyWith(
        currentSentenceIndex: _audioHandler.currentSentenceIndex,
      ),
    );
  }

  Future<void> setRate(double rate) async {
    emit(state.copyWith(rate: rate));
    await _audioHandler.setSpeed(rate);
  }

  Future<void> setPitch(double pitch) async {
    emit(state.copyWith(pitch: pitch));
    await _audioHandler.setPitch(pitch);
  }

  Future<void> setVolume(double volume) async {
    emit(state.copyWith(volume: volume));
    await _audioHandler.setVolume(volume);
  }

  Future<void> setLanguage(String languageCode) async {
    emit(state.copyWith(selectedLanguage: languageCode));
    await ttsService.setLanguage(languageCode);
  }

  Future<void> setEngine(String engine) async {
    emit(state.copyWith(selectedEngine: engine));
    await ttsService.setEngine(engine);
  }

  @override
  Future<void> close() async {
    await _playbackSub?.cancel();
    _audioHandler.dispose();
    ttsService.dispose();
    return super.close();
  }
}
