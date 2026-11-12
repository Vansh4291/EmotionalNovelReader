import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/entities/cloud_ai_config.dart';
import '../../domain/services/cloud_ai_service.dart';
import 'cloud_ai_state.dart';

class CloudAiCubit extends Cubit<CloudAiState> {
  CloudAiCubit({required this.cloudAiService}) : super(const CloudAiState());

  final CloudAiService cloudAiService;

  Future<void> loadConfig() async {
    emit(state.copyWith(isLoading: true, clearMessages: true));
    final config = await cloudAiService.getConfig();
    emit(state.copyWith(isLoading: false, config: config));
  }

  Future<void> grantConsentAndEnable() async {
    final updated = state.config.copyWith(enabled: true, userConsented: true);
    await cloudAiService.saveConfig(updated);
    emit(
      state.copyWith(
        config: updated,
        statusMessage: 'Cloud AI enabled with user consent.',
        clearMessages: false,
      ),
    );
  }

  Future<void> disableCloudAi() async {
    final updated = state.config.copyWith(enabled: false);
    await cloudAiService.saveConfig(updated);
    emit(
      state.copyWith(
        config: updated,
        statusMessage:
            'Cloud AI disabled. Zero network queries will be performed.',
        clearMessages: false,
      ),
    );
  }

  Future<void> updateProvider(CloudAiProvider provider) async {
    final updated = state.config.copyWith(
      provider: provider,
      endpointUrl: provider.defaultEndpoint,
      modelName: provider.defaultModel,
    );
    await cloudAiService.saveConfig(updated);
    emit(state.copyWith(config: updated));
  }

  Future<void> updateEndpoint(String endpointUrl) async {
    final updated = state.config.copyWith(endpointUrl: endpointUrl.trim());
    await cloudAiService.saveConfig(updated);
    emit(state.copyWith(config: updated));
  }

  Future<void> updateModelName(String modelName) async {
    final updated = state.config.copyWith(modelName: modelName.trim());
    await cloudAiService.saveConfig(updated);
    emit(state.copyWith(config: updated));
  }

  Future<void> saveApiKey(String apiKey) async {
    if (apiKey.trim().isEmpty) return;
    await cloudAiService.saveApiKey(apiKey.trim());
    final updated = state.config.copyWith(hasApiKey: true);
    await cloudAiService.saveConfig(updated);
    emit(
      state.copyWith(
        config: updated,
        statusMessage: 'API Key securely stored in Android KeyStore.',
      ),
    );
  }

  Future<void> clearApiKey() async {
    await cloudAiService.clearApiKey();
    final updated = state.config.copyWith(hasApiKey: false);
    await cloudAiService.saveConfig(updated);
    emit(
      state.copyWith(
        config: updated,
        statusMessage: 'API Key deleted from secure storage.',
      ),
    );
  }

  Future<void> testConnection() async {
    emit(state.copyWith(isTestingConnection: true, clearMessages: true));

    final result = await cloudAiService.testConnection();

    if (result.isSuccess) {
      emit(
        state.copyWith(
          isTestingConnection: false,
          testResult: result.dataOrNull ?? 'Connected successfully!',
        ),
      );
    } else {
      emit(
        state.copyWith(
          isTestingConnection: false,
          errorMessage: result.failureOrNull?.message ?? 'Connection failed',
        ),
      );
    }
  }
}
