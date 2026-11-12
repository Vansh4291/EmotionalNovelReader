import 'dart:io';

import '../../../../core/errors/failures.dart';
import '../entities/ai_inference_entities.dart';
import '../entities/ai_model_entity.dart';

abstract interface class ModelManagerService {
  Future<List<AiModelEntity>> getInstalledModels();
  Future<List<AiModelEntity>> getCatalogModels();
  Future<Result<AiModelEntity>> importModelFile(File file);
  Future<Result<void>> deleteModel(String modelId);
  Future<DeviceAiCapability> evaluateDeviceCapability();
}
