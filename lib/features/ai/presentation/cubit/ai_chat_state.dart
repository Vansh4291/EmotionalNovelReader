import '../../../search/domain/entities/search_result_entity.dart';

class AiChatMessage {
  const AiChatMessage({
    required this.id,
    required this.text,
    required this.isUser,
    required this.timestamp,
    this.referencedPassages = const [],
    this.isCloud = false,
  });

  final String id;
  final String text;
  final bool isUser;
  final DateTime timestamp;
  final List<ContentSearchResult> referencedPassages;
  final bool isCloud;
}

class AiChatState {
  const AiChatState({
    required this.bookId,
    required this.bookTitle,
    required this.currentChapterIndex,
    this.messages = const [],
    this.isGenerating = false,
    this.streamingResponse = '',
    this.activeModelName,
    this.hasModelLoaded = false,
    this.isCloudMode = false,
    this.isCloudAvailable = false,
    this.errorMessage,
  });

  final String bookId;
  final String bookTitle;
  final int currentChapterIndex;
  final List<AiChatMessage> messages;
  final bool isGenerating;
  final String streamingResponse;
  final String? activeModelName;
  final bool hasModelLoaded;
  final bool isCloudMode;
  final bool isCloudAvailable;
  final String? errorMessage;

  AiChatState copyWith({
    String? bookId,
    String? bookTitle,
    int? currentChapterIndex,
    List<AiChatMessage>? messages,
    bool? isGenerating,
    String? streamingResponse,
    String? activeModelName,
    bool? hasModelLoaded,
    bool? isCloudMode,
    bool? isCloudAvailable,
    String? errorMessage,
    bool clearError = false,
  }) {
    return AiChatState(
      bookId: bookId ?? this.bookId,
      bookTitle: bookTitle ?? this.bookTitle,
      currentChapterIndex: currentChapterIndex ?? this.currentChapterIndex,
      messages: messages ?? this.messages,
      isGenerating: isGenerating ?? this.isGenerating,
      streamingResponse: streamingResponse ?? this.streamingResponse,
      activeModelName: activeModelName ?? this.activeModelName,
      hasModelLoaded: hasModelLoaded ?? this.hasModelLoaded,
      isCloudMode: isCloudMode ?? this.isCloudMode,
      isCloudAvailable: isCloudAvailable ?? this.isCloudAvailable,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}
