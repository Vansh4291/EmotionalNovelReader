import '../../../../core/errors/failures.dart';
import '../entities/ai_inference_entities.dart';
import '../entities/cloud_ai_config.dart';

abstract interface class CloudAiService {
  Future<CloudAiConfig> getConfig();

  Future<void> saveConfig(CloudAiConfig config);

  Future<void> saveApiKey(String apiKey);

  Future<void> clearApiKey();

  Future<Result<String>> testConnection();

  Future<Result<String>> generate(AiPromptEntity prompt);

  Stream<String> generateStream(
    AiPromptEntity prompt, {
    bool Function()? isCancelled,
  });
}
