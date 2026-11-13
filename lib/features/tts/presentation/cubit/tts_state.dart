import '../../domain/entities/tts_entities.dart';

class TtsState {
  const TtsState({
    this.status = TtsPlaybackStatus.stopped,
    this.bookId,
    this.bookTitle = '',
    this.chapterId,
    this.chapterTitle = '',
    this.sentences = const [],
    this.currentSentenceIndex = 0,
    this.rate = 1.0,
    this.pitch = 1.0,
    this.volume = 1.0,
    this.selectedLanguage = 'en-US',
    this.availableLanguages = const [],
    this.availableEngines = const [],
    this.selectedEngine,
    this.errorMessage,
  });

  final TtsPlaybackStatus status;
  final String? bookId;
  final String bookTitle;
  final String? chapterId;
  final String chapterTitle;
  final List<TtsSentence> sentences;
  final int currentSentenceIndex;
  final double rate;
  final double pitch;
  final double volume;
  final String selectedLanguage;
  final List<String> availableLanguages;
  final List<String> availableEngines;
  final String? selectedEngine;
  final String? errorMessage;

  TtsSentence? get currentSentence =>
      (currentSentenceIndex >= 0 && currentSentenceIndex < sentences.length)
      ? sentences[currentSentenceIndex]
      : null;

  bool get isPlaying => status == TtsPlaybackStatus.playing;
  bool get isPaused => status == TtsPlaybackStatus.paused;
  bool get isStopped => status == TtsPlaybackStatus.stopped;

  TtsState copyWith({
    TtsPlaybackStatus? status,
    String? bookId,
    String? bookTitle,
    String? chapterId,
    String? chapterTitle,
    List<TtsSentence>? sentences,
    int? currentSentenceIndex,
    double? rate,
    double? pitch,
    double? volume,
    String? selectedLanguage,
    List<String>? availableLanguages,
    List<String>? availableEngines,
    String? selectedEngine,
    String? errorMessage,
    bool clearError = false,
  }) {
    return TtsState(
      status: status ?? this.status,
      bookId: bookId ?? this.bookId,
      bookTitle: bookTitle ?? this.bookTitle,
      chapterId: chapterId ?? this.chapterId,
      chapterTitle: chapterTitle ?? this.chapterTitle,
      sentences: sentences ?? this.sentences,
      currentSentenceIndex: currentSentenceIndex ?? this.currentSentenceIndex,
      rate: rate ?? this.rate,
      pitch: pitch ?? this.pitch,
      volume: volume ?? this.volume,
      selectedLanguage: selectedLanguage ?? this.selectedLanguage,
      availableLanguages: availableLanguages ?? this.availableLanguages,
      availableEngines: availableEngines ?? this.availableEngines,
      selectedEngine: selectedEngine ?? this.selectedEngine,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}
