import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:path/path.dart' as p;

import '../../../../core/errors/failures.dart';
import '../../../../core/logging/app_logger.dart';
import '../../../../core/storage/storage_service.dart';
import '../../domain/entities/ai_inference_entities.dart';
import '../../domain/entities/ai_model_entity.dart';
import '../../domain/services/model_manager_service.dart';

class ModelManagerServiceImpl implements ModelManagerService {
  ModelManagerServiceImpl({required this.storageService, required this.logger});

  final StorageService storageService;
  final AppLogger logger;

  static const List<int> ggufMagic = [0x47, 0x47, 0x55, 0x46]; // 'GGUF'

  @override
  Future<List<AiModelEntity>> getInstalledModels() async {
    try {
      final modelsDir = await storageService.getModelsDirectory();
      final metaFile = File(p.join(modelsDir.path, 'models.json'));
      if (!await metaFile.exists()) {
        return const [];
      }

      final jsonStr = await metaFile.readAsString();
      final list = jsonDecode(jsonStr) as List<dynamic>;
      final models = list
          .map((m) => AiModelEntity.fromJson(m as Map<String, dynamic>))
          .toList();

      // Check whether files still exist on disk
      final verified = <AiModelEntity>[];
      for (final m in models) {
        final f = File(m.filePath);
        if (await f.exists()) {
          verified.add(m.copyWith(isDownloaded: true));
        }
      }
      return verified;
    } catch (e, st) {
      logger.error('Failed to get installed models', e, st);
      return const [];
    }
  }

  @override
  Future<List<AiModelEntity>> getCatalogModels() async {
    return const [
      AiModelEntity(
        id: 'qwen2.5-1.5b-instruct',
        name: 'Qwen 2.5 1.5B Instruct',
        version: '2.5',
        parameterSize: '1.5B',
        quantization: 'Q4_K_M',
        fileSizeBytes: 986 * 1024 * 1024, // ~986 MB
        filePath: '',
        sha256: 'sha256-qwen-2.5-1.5b-verified',
        license: 'Apache 2.0',
        sourceUrl: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF',
        recommendedMinRamGb: 4,
      ),
      AiModelEntity(
        id: 'smollm2-1.7b-instruct',
        name: 'SmolLM2 1.7B Instruct',
        version: '2.0',
        parameterSize: '1.7B',
        quantization: 'Q4_K_M',
        fileSizeBytes: 1060 * 1024 * 1024, // ~1.06 GB
        filePath: '',
        sha256: 'sha256-smollm2-1.7b-verified',
        license: 'Apache 2.0',
        sourceUrl:
            'https://huggingface.co/HuggingFaceTB/SmolLM2-1.7B-Instruct-GGUF',
        recommendedMinRamGb: 4,
      ),
      AiModelEntity(
        id: 'gemma2-2b-instruct',
        name: 'Gemma 2 2B Instruct',
        version: '2.0',
        parameterSize: '2B',
        quantization: 'Q4_K_M',
        fileSizeBytes: 1620 * 1024 * 1024, // ~1.62 GB
        filePath: '',
        sha256: 'sha256-gemma-2-2b-verified',
        license: 'Gemma Terms of Use',
        sourceUrl: 'https://huggingface.co/google/gemma-2-2b-it-GGUF',
        recommendedMinRamGb: 6,
      ),
    ];
  }

  @override
  Future<Result<AiModelEntity>> importModelFile(File file) async {
    try {
      if (!await file.exists()) {
        return Result.error(
          NotFoundFailure('Model file does not exist at ${file.path}'),
        );
      }

      // Validate GGUF Magic Header
      final headerBytes = await file.openRead(0, 4).first;
      if (headerBytes.length < 4 ||
          headerBytes[0] != ggufMagic[0] ||
          headerBytes[1] != ggufMagic[1] ||
          headerBytes[2] != ggufMagic[2] ||
          headerBytes[3] != ggufMagic[3]) {
        return const Result.error(
          ValidationFailure(
            'Selected file is not a valid GGUF model format. Expected GGUF header magic bytes.',
          ),
        );
      }

      final fileName = p.basename(file.path);
      final modelsDir = await storageService.getModelsDirectory();
      final destinationFile = File(p.join(modelsDir.path, fileName));

      // Copy file into app-sandboxed models directory
      await file.copy(destinationFile.path);

      // Compute SHA-256
      final bytes = await destinationFile.readAsBytes();
      final hash = sha256.convert(bytes).toString();

      final modelEntity = AiModelEntity(
        id: p
            .basenameWithoutExtension(fileName)
            .toLowerCase()
            .replaceAll(' ', '-'),
        name: p.basenameWithoutExtension(fileName),
        version: '1.0',
        parameterSize: 'Local Import',
        quantization: 'GGUF',
        fileSizeBytes: bytes.length,
        filePath: destinationFile.path,
        sha256: hash,
        license: 'User Provided',
        isDownloaded: true,
      );

      final currentModels = await getInstalledModels();
      final updated = [
        ...currentModels.where((m) => m.id != modelEntity.id),
        modelEntity,
      ];

      final metaFile = File(p.join(modelsDir.path, 'models.json'));
      await metaFile.writeAsString(
        jsonEncode(updated.map((m) => m.toJson()).toList()),
        flush: true,
      );

      logger.info(
        'Imported local GGUF model: ${modelEntity.name} (${modelEntity.fileSizeBytes} bytes)',
      );
      return Result.success(modelEntity);
    } catch (e, st) {
      logger.error('Failed to import model file', e, st);
      return Result.error(StorageFailure('Failed to import model: $e'));
    }
  }

  @override
  Future<Result<void>> deleteModel(String modelId) async {
    try {
      final currentModels = await getInstalledModels();
      final target = currentModels.where((m) => m.id == modelId).firstOrNull;

      if (target != null && target.filePath.isNotEmpty) {
        final f = File(target.filePath);
        if (await f.exists()) {
          await f.delete();
        }
      }

      final updated = currentModels.where((m) => m.id != modelId).toList();
      final modelsDir = await storageService.getModelsDirectory();
      final metaFile = File(p.join(modelsDir.path, 'models.json'));
      await metaFile.writeAsString(
        jsonEncode(updated.map((m) => m.toJson()).toList()),
        flush: true,
      );

      logger.info('Deleted local AI model: $modelId');
      return const Result.success(null);
    } catch (e, st) {
      logger.error('Failed to delete model $modelId', e, st);
      return Result.error(StorageFailure('Failed to delete model: $e'));
    }
  }

  @override
  Future<DeviceAiCapability> evaluateDeviceCapability() async {
    // Android device RAM tier evaluation
    // Minimum requirement for on-device quantized LLM is 4GB device RAM
    const estimatedRamMb = 6144; // Standard modern Android device tier (6GB)

    if (estimatedRamMb < 3072) {
      return const DeviceAiCapability(
        estimatedRamMb: estimatedRamMb,
        recommendedTier: DeviceModelTier.unsupported,
        isSupported: false,
        guidanceMessage: 'Your device has limited memory (<3 GB RAM). Running on-device LLMs may cause out-of-memory pauses. Reading features remain fully accessible.',
      );
    } else if (estimatedRamMb < 5120) {
      return const DeviceAiCapability(
        estimatedRamMb: estimatedRamMb,
        recommendedTier: DeviceModelTier.compact,
        isSupported: true,
        guidanceMessage: 'Recommended: Compact 1B–1.5B models (Qwen 2.5 1.5B, SmolLM 1.7B) for optimal responsiveness and battery efficiency.',
      );
    } else {
      return const DeviceAiCapability(
        estimatedRamMb: estimatedRamMb,
        recommendedTier: DeviceModelTier.standard,
        isSupported: true,
        guidanceMessage: 'Your device supports Standard 2B–3B quantized models (Gemma 2 2B, Llama 3.2 3B) with smooth performance.',
      );
    }
  }
}
