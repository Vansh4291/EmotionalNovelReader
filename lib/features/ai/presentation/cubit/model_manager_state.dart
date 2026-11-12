import '../../domain/entities/ai_inference_entities.dart';
import '../../domain/entities/ai_model_entity.dart';

class ModelManagerState {
  const ModelManagerState({
    this.isLoading = false,
    this.installedModels = const [],
    this.catalogModels = const [],
    this.loadedModel,
    this.capability,
    this.errorMessage,
    this.statusMessage,
  });

  final bool isLoading;
  final List<AiModelEntity> installedModels;
  final List<AiModelEntity> catalogModels;
  final AiModelEntity? loadedModel;
  final DeviceAiCapability? capability;
  final String? errorMessage;
  final String? statusMessage;

  bool get hasActiveModel => loadedModel != null;

  ModelManagerState copyWith({
    bool? isLoading,
    List<AiModelEntity>? installedModels,
    List<AiModelEntity>? catalogModels,
    AiModelEntity? loadedModel,
    DeviceAiCapability? capability,
    String? errorMessage,
    String? statusMessage,
    bool clearLoadedModel = false,
    bool clearError = false,
    bool clearStatus = false,
  }) {
    return ModelManagerState(
      isLoading: isLoading ?? this.isLoading,
      installedModels: installedModels ?? this.installedModels,
      catalogModels: catalogModels ?? this.catalogModels,
      loadedModel: clearLoadedModel ? null : (loadedModel ?? this.loadedModel),
      capability: capability ?? this.capability,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      statusMessage: clearStatus ? null : (statusMessage ?? this.statusMessage),
    );
  }
}
