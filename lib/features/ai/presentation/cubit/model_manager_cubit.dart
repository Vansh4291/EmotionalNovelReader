import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/entities/ai_model_entity.dart';
import '../../domain/services/local_ai_runtime.dart';
import '../../domain/services/model_manager_service.dart';
import 'model_manager_state.dart';

typedef ModelPickerFn = Future<String?> Function();

class ModelManagerCubit extends Cubit<ModelManagerState> {
  ModelManagerCubit({
    required this.modelManagerService,
    required this.aiRuntime,
    this.filePickerOverride,
  }) : super(const ModelManagerState());

  final ModelManagerService modelManagerService;
  final LocalAiRuntime aiRuntime;
  final ModelPickerFn? filePickerOverride;

  Future<void> loadModelsAndCapability() async {
    emit(state.copyWith(isLoading: true, clearError: true));

    final installed = await modelManagerService.getInstalledModels();
    final catalog = await modelManagerService.getCatalogModels();
    final capability = await modelManagerService.evaluateDeviceCapability();

    emit(
      state.copyWith(
        isLoading: false,
        installedModels: installed,
        catalogModels: catalog,
        loadedModel: aiRuntime.currentLoadedModel,
        capability: capability,
      ),
    );
  }

  Future<void> pickAndImportModel() async {
    emit(state.copyWith(isLoading: true, clearError: true));

    try {
      String? selectedPath;
      if (filePickerOverride != null) {
        selectedPath = await filePickerOverride!();
      } else {
        final result = await FilePicker.platform.pickFiles(
          type: FileType.custom,
          allowedExtensions: ['gguf', 'bin'],
        );
        selectedPath = result?.files.single.path;
      }

      if (selectedPath == null) {
        emit(state.copyWith(isLoading: false));
        return;
      }

      final file = File(selectedPath);
      final importRes = await modelManagerService.importModelFile(file);

      if (importRes.isError) {
        emit(
          state.copyWith(
            isLoading: false,
            errorMessage:
                importRes.failureOrNull?.message ?? 'Failed to import model',
          ),
        );
        return;
      }

      final imported = importRes.dataOrNull!;
      await loadModelsAndCapability();
      emit(
        state.copyWith(
          statusMessage: 'Successfully imported model ${imported.name}',
        ),
      );
    } catch (e) {
      emit(state.copyWith(isLoading: false, errorMessage: 'Import failed: $e'));
    }
  }

  Future<void> loadModelIntoRuntime(AiModelEntity model) async {
    emit(state.copyWith(isLoading: true, clearError: true));

    final success = await aiRuntime.loadModel(model);
    if (!success) {
      emit(
        state.copyWith(
          isLoading: false,
          errorMessage: 'Failed to load model ${model.name} into memory',
        ),
      );
      return;
    }

    emit(
      state.copyWith(
        isLoading: false,
        loadedModel: model,
        statusMessage:
            'Loaded ${model.name} (${model.parameterSize}) into memory',
      ),
    );
  }

  Future<void> unloadCurrentModel() async {
    emit(state.copyWith(isLoading: true, clearError: true));
    await aiRuntime.unloadModel();
    emit(
      state.copyWith(
        isLoading: false,
        clearLoadedModel: true,
        statusMessage: 'Model unloaded from memory',
      ),
    );
  }

  Future<void> deleteModel(String modelId) async {
    emit(state.copyWith(isLoading: true, clearError: true));

    if (aiRuntime.currentLoadedModel?.id == modelId) {
      await aiRuntime.unloadModel();
    }

    final delRes = await modelManagerService.deleteModel(modelId);
    if (delRes.isError) {
      emit(
        state.copyWith(
          isLoading: false,
          errorMessage:
              delRes.failureOrNull?.message ?? 'Failed to delete model',
        ),
      );
      return;
    }

    await loadModelsAndCapability();
    emit(state.copyWith(statusMessage: 'Model deleted successfully'));
  }
}
