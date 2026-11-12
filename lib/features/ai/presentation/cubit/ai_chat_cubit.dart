import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:uuid/uuid.dart';

import '../../domain/services/cloud_ai_service.dart';
import '../../domain/services/local_ai_runtime.dart';
import '../../domain/services/reader_rag_service.dart';
import 'ai_chat_state.dart';

class AiChatCubit extends Cubit<AiChatState> {
  AiChatCubit({
    required String bookId,
    required String bookTitle,
    required int currentChapterIndex,
    required this.ragService,
    required this.aiRuntime,
    this.cloudAiService,
  }) : _uuid = const Uuid(),
       super(
         AiChatState(
           bookId: bookId,
           bookTitle: bookTitle,
           currentChapterIndex: currentChapterIndex,
           hasModelLoaded: aiRuntime.isModelLoaded,
           activeModelName: aiRuntime.currentLoadedModel?.name,
         ),
       );

  final ReaderRagService ragService;
  final LocalAiRuntime aiRuntime;
  final CloudAiService? cloudAiService;
  final Uuid _uuid;
  bool _cancelled = false;

  void updatePosition(int newChapterIndex) {
    emit(state.copyWith(currentChapterIndex: newChapterIndex));
  }

  Future<void> refreshModelStatus() async {
    bool cloudAvailable = false;
    if (cloudAiService != null) {
      final config = await cloudAiService!.getConfig();
      cloudAvailable =
          config.enabled && config.userConsented && config.hasApiKey;
    }

    emit(
      state.copyWith(
        hasModelLoaded: aiRuntime.isModelLoaded,
        activeModelName: aiRuntime.currentLoadedModel?.name,
        isCloudAvailable: cloudAvailable,
      ),
    );
  }

  void toggleCloudMode(bool isCloud) {
    emit(state.copyWith(isCloudMode: isCloud));
  }

  Future<void> askQuestion({
    required String query,
    String? currentChapterExcerpt,
  }) async {
    if (query.trim().isEmpty) return;

    _cancelled = false;

    // Validation:
    if (state.isCloudMode) {
      if (cloudAiService == null) {
        emit(
          state.copyWith(errorMessage: 'Cloud AI service is not available.'),
        );
        return;
      }
      final config = await cloudAiService!.getConfig();
      if (!config.enabled || !config.userConsented) {
        emit(
          state.copyWith(
            errorMessage: 'Cloud AI is disabled. Please enable it with consent in Settings.',
          ),
        );
        return;
      }
      if (!config.hasApiKey) {
        emit(
          state.copyWith(
            errorMessage:
                'Cloud AI API key is missing. Please configure it in Settings.',
          ),
        );
        return;
      }
    } else {
      // Local mode validation
      if (!aiRuntime.isModelLoaded) {
        emit(
          state.copyWith(
            errorMessage: 'No local AI model loaded. Please load a model in Local AI Settings.',
          ),
        );
        return;
      }
    }

    final userMessage = AiChatMessage(
      id: _uuid.v4(),
      text: query.trim(),
      isUser: true,
      timestamp: DateTime.now().toUtc(),
    );

    emit(
      state.copyWith(
        messages: [...state.messages, userMessage],
        isGenerating: true,
        streamingResponse: '',
        clearError: true,
      ),
    );

    try {
      // Step 1: Retrieve spoiler-safe grounded context (restricted to chapter <= currentChapterIndex)
      final passages = await ragService.retrieveSpoilerSafePassages(
        bookId: state.bookId,
        query: query,
        currentChapterIndex: state.currentChapterIndex,
      );

      // Step 2: Build spoiler-safe prompt
      final prompt = ragService.buildSpoilerSafePrompt(
        bookTitle: state.bookTitle,
        query: query,
        currentChapterIndex: state.currentChapterIndex,
        passages: passages,
        currentChapterExcerpt: currentChapterExcerpt,
      );

      // Step 3: Stream generation from either Local AI or Cloud AI (explicit user selection)
      final buffer = StringBuffer();
      final stream = state.isCloudMode
          ? cloudAiService!.generateStream(
              prompt,
              isCancelled: () => _cancelled,
            )
          : aiRuntime.generateStream(prompt, isCancelled: () => _cancelled);

      await for (final token in stream) {
        if (_cancelled) break;
        buffer.write(token);
        emit(state.copyWith(streamingResponse: buffer.toString()));
      }

      final assistantMessage = AiChatMessage(
        id: _uuid.v4(),
        text: buffer.toString().trim(),
        isUser: false,
        timestamp: DateTime.now().toUtc(),
        referencedPassages: passages,
        isCloud: state.isCloudMode,
      );

      emit(
        state.copyWith(
          messages: [...state.messages, assistantMessage],
          isGenerating: false,
          streamingResponse: '',
        ),
      );
    } catch (e) {
      emit(
        state.copyWith(
          isGenerating: false,
          streamingResponse: '',
          errorMessage: 'Generation failed: $e',
        ),
      );
    }
  }

  void cancelGeneration() {
    _cancelled = true;
    emit(state.copyWith(isGenerating: false));
  }

  void clearChat() {
    emit(
      state.copyWith(
        messages: const [],
        streamingResponse: '',
        clearError: true,
      ),
    );
  }
}
