import 'dart:async';

import 'package:emotional_novel_reader/features/ai/domain/entities/ai_inference_entities.dart';
import 'package:emotional_novel_reader/features/ai/domain/entities/ai_model_entity.dart';
import 'package:emotional_novel_reader/features/ai/domain/services/local_ai_runtime.dart';
import 'package:emotional_novel_reader/features/ai/domain/services/reader_rag_service.dart';
import 'package:emotional_novel_reader/features/ai/presentation/cubit/ai_chat_cubit.dart';
import 'package:emotional_novel_reader/features/search/domain/entities/search_result_entity.dart';
import 'package:flutter_test/flutter_test.dart';

class MockLocalAiRuntime implements LocalAiRuntime {
  MockLocalAiRuntime();

  bool _isModelLoaded = false;
  AiModelEntity? _model;
  List<String> tokensToEmit = ['Holo ', 'is ', 'the ', 'Wise ', 'Wolf.'];

  @override
  bool get isModelLoaded => _isModelLoaded;

  @override
  AiModelEntity? get currentLoadedModel => _model;

  void setModel(AiModelEntity? model) {
    _model = model;
    _isModelLoaded = model != null;
  }

  @override
  Future<bool> loadModel(AiModelEntity model) async {
    _model = model;
    _isModelLoaded = true;
    return true;
  }

  @override
  Future<void> unloadModel() async {
    _model = null;
    _isModelLoaded = false;
  }

  @override
  Future<AiGenerationResult> generate(
    AiPromptEntity prompt, {
    bool Function()? isCancelled,
  }) async {
    final text = tokensToEmit.join();
    return AiGenerationResult(
      text: text,
      promptTokens: 10,
      completionTokens: 5,
      durationMs: 250,
      modelId: _model?.id ?? 'mock-model',
    );
  }

  @override
  Stream<String> generateStream(
    AiPromptEntity prompt, {
    bool Function()? isCancelled,
  }) async* {
    for (final token in tokensToEmit) {
      if (isCancelled?.call() == true) break;
      yield token;
    }
  }
}

class MockReaderRagService implements ReaderRagService {
  List<ContentSearchResult> passagesToReturn = [];

  @override
  Future<List<ContentSearchResult>> retrieveSpoilerSafePassages({
    required String bookId,
    required String query,
    required int currentChapterIndex,
    int maxPassages = 5,
  }) async {
    return passagesToReturn;
  }

  @override
  AiPromptEntity buildSpoilerSafePrompt({
    required String bookTitle,
    required String query,
    required int currentChapterIndex,
    required List<ContentSearchResult> passages,
    String? currentChapterExcerpt,
  }) {
    return AiPromptEntity(
      systemPrompt: 'System prompt for $bookTitle',
      userPrompt: 'User prompt: $query',
      maxTokens: 512,
      temperature: 0.7,
    );
  }
}

void main() {
  late MockLocalAiRuntime mockRuntime;
  late MockReaderRagService mockRagService;

  setUp(() {
    mockRuntime = MockLocalAiRuntime();
    mockRagService = MockReaderRagService();
  });

  group('AiChatCubit Tests', () {
    test('Initial state reflects book info and model status', () {
      final cubit = AiChatCubit(
        bookId: 'b1',
        bookTitle: 'Spice and Wolf',
        currentChapterIndex: 1,
        ragService: mockRagService,
        aiRuntime: mockRuntime,
      );

      expect(cubit.state.bookId, equals('b1'));
      expect(cubit.state.bookTitle, equals('Spice and Wolf'));
      expect(cubit.state.currentChapterIndex, equals(1));
      expect(cubit.state.hasModelLoaded, isFalse);
      expect(cubit.state.messages, isEmpty);
    });

    test('askQuestion without a loaded model emits error message', () async {
      final cubit = AiChatCubit(
        bookId: 'b1',
        bookTitle: 'Spice and Wolf',
        currentChapterIndex: 1,
        ragService: mockRagService,
        aiRuntime: mockRuntime,
      );

      await cubit.askQuestion(query: 'Who is Holo?');

      expect(cubit.state.errorMessage, isNotNull);
      expect(cubit.state.errorMessage, contains('No local AI model loaded'));
      expect(cubit.state.messages, isEmpty);
    });

    test('askQuestion with loaded model queries RAG and streams assistant response', () async {
      mockRuntime.setModel(
        const AiModelEntity(
          id: 'qwen',
          name: 'Qwen 2.5 1.5B',
          version: '1.0',
          parameterSize: '1.5B',
          quantization: 'Q4',
          fileSizeBytes: 1000,
          filePath: '/test/qwen.gguf',
          sha256: 'abc',
          license: 'Apache 2.0',
        ),
      );

      mockRagService.passagesToReturn = [
        const ContentSearchResult(
          chapterId: 'c0',
          bookId: 'b1',
          chapterIndex: 0,
          bookTitle: 'Spice and Wolf',
          chapterTitle: 'Prologue',
          snippet: 'Holo the Wise Wolf of Yoitsu',
        ),
      ];

      final cubit = AiChatCubit(
        bookId: 'b1',
        bookTitle: 'Spice and Wolf',
        currentChapterIndex: 1,
        ragService: mockRagService,
        aiRuntime: mockRuntime,
      );

      await cubit.askQuestion(query: 'Who is Holo?');

      expect(cubit.state.errorMessage, isNull);
      expect(cubit.state.messages.length, equals(2));
      // First message: User
      expect(cubit.state.messages[0].isUser, isTrue);
      expect(cubit.state.messages[0].text, equals('Who is Holo?'));
      // Second message: Assistant
      expect(cubit.state.messages[1].isUser, isFalse);
      expect(cubit.state.messages[1].text, equals('Holo is the Wise Wolf.'));
      expect(cubit.state.messages[1].referencedPassages.length, equals(1));
      expect(
        cubit.state.messages[1].referencedPassages.first.chapterTitle,
        equals('Prologue'),
      );
    });

    test('clearChat resets messages list', () async {
      mockRuntime.setModel(
        const AiModelEntity(
          id: 'qwen',
          name: 'Qwen 2.5 1.5B',
          version: '1.0',
          parameterSize: '1.5B',
          quantization: 'Q4',
          fileSizeBytes: 1000,
          filePath: '/test/qwen.gguf',
          sha256: 'abc',
          license: 'Apache 2.0',
        ),
      );

      final cubit = AiChatCubit(
        bookId: 'b1',
        bookTitle: 'Spice and Wolf',
        currentChapterIndex: 1,
        ragService: mockRagService,
        aiRuntime: mockRuntime,
      );

      await cubit.askQuestion(query: 'Hello');
      expect(cubit.state.messages, isNotEmpty);

      cubit.clearChat();
      expect(cubit.state.messages, isEmpty);
    });
  });
}
