import '../entities/ai_inference_entities.dart';
import '../entities/ai_model_entity.dart';

abstract interface class LocalAiRuntime {
  Future<bool> loadModel(AiModelEntity model);
  Future<void> unloadModel();
  bool get isModelLoaded;
  AiModelEntity? get currentLoadedModel;

  Stream<String> generateStream(
    AiPromptEntity prompt, {
    bool Function()? isCancelled,
  });

  Future<AiGenerationResult> generate(
    AiPromptEntity prompt, {
    bool Function()? isCancelled,
  });
}
