import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/logging/app_logger.dart';
import '../../domain/entities/tts_entities.dart';
import '../../domain/services/tts_service.dart';
import '../../domain/services/tts_text_parser.dart';
import 'tts_state.dart';

typedef TtsSentenceChangeCallback = void Function(TtsSentence sentence);
typedef TtsChapterCompletedCallback = void Function();

class TtsCubit extends Cubit<TtsState> {
  TtsCubit({
    required this.ttsService,
    this.textParser = const TtsTextParser(),
    required this.logger,
  }) : super(const TtsState()) {
    _bindServiceHandlers();
  }

  final TtsService ttsService;
  final TtsTextParser textParser;
  final AppLogger logger;

  TtsSentenceChangeCallback? onSentenceChanged;
  TtsChapterCompletedCallback? onChapterCompleted;

  void _bindServiceHandlers() {
    ttsService.setCompletionHandler(() {
      _handleSentenceFinished();
    });

    ttsService.setErrorHandler((errorMsg) {
      logger.error('TTS error callback received: $errorMsg');
      emit(
        state.copyWith(
          status: TtsPlaybackStatus.stopped,
          errorMessage: errorMsg,
        ),
      );
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
        chapterId: chapterId,
        chapterTitle: chapterTitle,
        sentences: sentences,
        currentSentenceIndex: validIndex,
        status: TtsPlaybackStatus.stopped,
        clearError: true,
      ),
    );

    if (autoPlay && sentences.isNotEmpty) {
      await play();
    }
  }

  Future<void> play() async {
    if (state.sentences.isEmpty) return;

    final sentence = state.currentSentence;
    if (sentence == null) return;

    emit(state.copyWith(status: TtsPlaybackStatus.playing, clearError: true));
    onSentenceChanged?.call(sentence);

    await ttsService.setSpeechRate(state.rate);
    await ttsService.setPitch(state.pitch);
    await ttsService.setVolume(state.volume);
    await ttsService.speak(sentence.text);
  }

  Future<void> pause() async {
    if (state.status != TtsPlaybackStatus.playing) return;
    await ttsService.pause();
    emit(state.copyWith(status: TtsPlaybackStatus.paused));
  }

  Future<void> resume() async {
    if (state.status != TtsPlaybackStatus.paused) return;
    await play();
  }

  Future<void> stop() async {
    await ttsService.stop();
    emit(state.copyWith(status: TtsPlaybackStatus.stopped));
  }

  Future<void> nextSentence() async {
    if (state.sentences.isEmpty) return;

    if (state.currentSentenceIndex + 1 < state.sentences.length) {
      emit(
        state.copyWith(currentSentenceIndex: state.currentSentenceIndex + 1),
      );
      if (state.isPlaying) {
        await play();
      }
    } else {
      // Reached end of chapter
      await stop();
      onChapterCompleted?.call();
    }
  }

  Future<void> previousSentence() async {
    if (state.sentences.isEmpty) return;

    if (state.currentSentenceIndex > 0) {
      emit(
        state.copyWith(currentSentenceIndex: state.currentSentenceIndex - 1),
      );
      if (state.isPlaying) {
        await play();
      }
    }
  }

  Future<void> seekToSentence(int index) async {
    if (state.sentences.isEmpty) return;
    final clamped = index.clamp(0, state.sentences.length - 1);
    emit(state.copyWith(currentSentenceIndex: clamped));
    if (state.isPlaying) {
      await play();
    }
  }

  Future<void> setRate(double rate) async {
    emit(state.copyWith(rate: rate));
    await ttsService.setSpeechRate(rate);
  }

  Future<void> setPitch(double pitch) async {
    emit(state.copyWith(pitch: pitch));
    await ttsService.setPitch(pitch);
  }

  Future<void> setVolume(double volume) async {
    emit(state.copyWith(volume: volume));
    await ttsService.setVolume(volume);
  }

  Future<void> setLanguage(String languageCode) async {
    emit(state.copyWith(selectedLanguage: languageCode));
    await ttsService.setLanguage(languageCode);
  }

  Future<void> setEngine(String engine) async {
    emit(state.copyWith(selectedEngine: engine));
    await ttsService.setEngine(engine);
  }

  void _handleSentenceFinished() {
    if (state.isPlaying) {
      nextSentence();
    }
  }

  @override
  Future<void> close() async {
    await ttsService.stop();
    ttsService.dispose();
    return super.close();
  }
}
