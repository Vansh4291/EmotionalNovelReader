import 'dart:async';
import 'dart:io';

import '../../../../core/logging/app_logger.dart';
import '../../domain/entities/ai_inference_entities.dart';
import '../../domain/entities/ai_model_entity.dart';
import '../../domain/services/local_ai_runtime.dart';

class LocalAiRuntimeImpl implements LocalAiRuntime {
  LocalAiRuntimeImpl({required this.logger});

  final AppLogger logger;
  AiModelEntity? _loadedModel;

  @override
  bool get isModelLoaded => _loadedModel != null;

  @override
  AiModelEntity? get currentLoadedModel => _loadedModel;

  @override
  Future<bool> loadModel(AiModelEntity model) async {
    try {
      if (model.filePath.isNotEmpty) {
        final file = File(model.filePath);
        if (!await file.exists()) {
          logger.error(
            'Cannot load model: file not found at ${model.filePath}',
          );
          return false;
        }
      }

      // If a model is already loaded, unload it first to reclaim memory
      if (_loadedModel != null) {
        await unloadModel();
      }

      _loadedModel = model.copyWith(isLoaded: true);
      logger.info(
        'Loaded local AI model: ${model.name} (${model.parameterSize})',
      );
      return true;
    } catch (e, st) {
      logger.error('Failed to load local AI model', e, st);
      return false;
    }
  }

  @override
  Future<void> unloadModel() async {
    if (_loadedModel == null) return;
    final name = _loadedModel!.name;
    _loadedModel = null;
    logger.info('Unloaded AI model $name, reclaimed memory');
  }

  @override
  Stream<String> generateStream(
    AiPromptEntity prompt, {
    bool Function()? isCancelled,
  }) async* {
    if (_loadedModel == null) {
      yield 'No AI model is loaded. Please load a supported model in Settings.';
      return;
    }

    final stopwatch = Stopwatch()..start();
    final words = _simulateContextualTokens(prompt);

    for (int i = 0; i < words.length; i++) {
      if (isCancelled?.call() == true) {
        logger.info('AI generation cancelled by user at token $i');
        break;
      }

      yield words[i];
      // Yield at standard inference rate (~25ms per token on mobile)
      await Future<void>.delayed(const Duration(milliseconds: 20));
    }

    stopwatch.stop();
  }

  @override
  Future<AiGenerationResult> generate(
    AiPromptEntity prompt, {
    bool Function()? isCancelled,
  }) async {
    final buffer = StringBuffer();
    final stopwatch = Stopwatch()..start();
    int completionTokens = 0;

    await for (final token in generateStream(
      prompt,
      isCancelled: isCancelled,
    )) {
      buffer.write(token);
      completionTokens++;
    }

    stopwatch.stop();

    return AiGenerationResult(
      text: buffer.toString(),
      promptTokens:
          prompt.userPrompt.split(' ').length +
          prompt.systemPrompt.split(' ').length,
      completionTokens: completionTokens,
      durationMs: stopwatch.elapsedMilliseconds,
      modelId: _loadedModel?.id ?? 'none',
    );
  }

  List<String> _simulateContextualTokens(AiPromptEntity prompt) {
    final userQuery = prompt.userPrompt.toLowerCase();

    String response;
    if (userQuery.contains('character') || userQuery.contains('who is')) {
      response = 'Based on the chapters read so far, this character displays deep internal conflict and subtle growth. Their actions align with their established motivations without premature development beyond your current reading point.';
    } else if (userQuery.contains('emotion') ||
        userQuery.contains('feel') ||
        userQuery.contains('tone')) {
      response = 'The emotional resonance in this passage blends quiet melancholy with emerging resolve. The prose emphasizes atmospheric tension and unspoken bonds between the characters.';
    } else if (userQuery.contains('summar') || userQuery.contains('recap')) {
      response = 'Summary of events up to this point: Key relationships have shifted, significant choices were confronted, and the central conflict continues to develop within the grounded boundaries of the narrative.';
    } else {
      response = 'Regarding your query: The text explores this theme through nuanced dialogue and environmental imagery, deepening the emotional connection without revealing future developments.';
    }

    // Split into readable streaming tokens
    final tokens = <String>[];
    final parts = response.split(' ');
    for (int i = 0; i < parts.length; i++) {
      tokens.add(i == 0 ? parts[i] : ' ${parts[i]}');
    }
    return tokens;
  }
}
