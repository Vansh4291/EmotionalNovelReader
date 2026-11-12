import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/entities/ai_inference_entities.dart';
import '../../domain/entities/ai_model_entity.dart';
import '../cubit/model_manager_cubit.dart';
import '../cubit/model_manager_state.dart';

class ModelManagerScreen extends StatelessWidget {
  const ModelManagerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Local AI & Models')),
      body: BlocConsumer<ModelManagerCubit, ModelManagerState>(
        listener: (context, state) {
          if (state.errorMessage != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.errorMessage!),
                backgroundColor: colorScheme.error,
              ),
            );
          } else if (state.statusMessage != null) {
            ScaffoldMessenger.of(context)
                .showSnackBar(SnackBar(content: Text(state.statusMessage!)));
          }
        },
        builder: (context, state) {
          if (state.isLoading && state.installedModels.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          final cubit = context.read<ModelManagerCubit>();

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _buildPrivacyBanner(context),
              const SizedBox(height: 16),
              if (state.capability != null)
                _buildCapabilityCard(context, state.capability!),
              const SizedBox(height: 16),
              if (state.loadedModel != null)
                _buildActiveModelCard(context, state.loadedModel!, cubit),
              const SizedBox(height: 16),
              _buildInstalledSection(context, state.installedModels, cubit),
              const SizedBox(height: 24),
              const Divider(),
              const SizedBox(height: 16),
              _buildCatalogSection(context, state.catalogModels),
            ],
          );
        },
      ),
    );
  }

  Widget _buildPrivacyBanner(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Card(
      color: colorScheme.surfaceContainerHighest,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: colorScheme.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.lock_outline, color: colorScheme.primary, size: 28),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '100% On-Device AI Privacy',
                    style: Theme.of(context).textTheme.titleSmall
                        ?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Local models execute entirely within this device. Book text, notes, and questions are never uploaded to cloud servers or third-party APIs.',
                    style: Theme.of(context).textTheme.bodySmall
                        ?.copyWith(color: colorScheme.onSurfaceVariant),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCapabilityCard(BuildContext context, DeviceAiCapability cap) {
    final colorScheme = Theme.of(context).colorScheme;

    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.memory_rounded, color: colorScheme.primary),
                const SizedBox(width: 8),
                Text(
                  'Hardware Assessment',
                  style: Theme.of(context).textTheme.titleSmall
                      ?.copyWith(fontWeight: FontWeight.bold),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: colorScheme.primaryContainer,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    cap.recommendedTier == DeviceModelTier.compact
                        ? 'Compact (1B–1.5B)'
                        : cap.recommendedTier == DeviceModelTier.standard
                        ? 'Standard (2B–3B)'
                        : 'Limited',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: colorScheme.onPrimaryContainer,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              cap.guidanceMessage,
              style: Theme.of(context).textTheme.bodySmall
                  ?.copyWith(color: colorScheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActiveModelCard(
    BuildContext context,
    AiModelEntity model,
    ModelManagerCubit cubit,
  ) {
    final colorScheme = Theme.of(context).colorScheme;

    return Card(
      color: colorScheme.primaryContainer.withValues(alpha: 0.3),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: colorScheme.primary, width: 1.5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            const Icon(
              Icons.check_circle_rounded,
              color: Colors.green,
              size: 28,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Active Model: ${model.name}',
                    style: Theme.of(context).textTheme.titleSmall
                        ?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  Text(
                    '${model.parameterSize} • ${model.quantization} • Loaded in RAM',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            OutlinedButton(
              onPressed: () => cubit.unloadCurrentModel(),
              child: const Text('Unload'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInstalledSection(
    BuildContext context,
    List<AiModelEntity> installed,
    ModelManagerCubit cubit,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Installed Models',
              style: Theme.of(context).textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            FilledButton.tonalIcon(
              icon: const Icon(Icons.file_upload_outlined, size: 18),
              label: const Text('Import GGUF'),
              onPressed: () => cubit.pickAndImportModel(),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (installed.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Text(
              'No local models installed yet. Tap "Import GGUF" to select a model file from your device.',
              style: TextStyle(color: Colors.grey),
            ),
          )
        else
          ...installed.map((model) {
            final sizeMb = (model.fileSizeBytes / (1024 * 1024))
                .toStringAsFixed(1);
            final isLoaded = cubit.state.loadedModel?.id == model.id;

            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
              child: ListTile(
                leading: const Icon(Icons.psychology_outlined),
                title: Text(model.name),
                subtitle: Text(
                  '$sizeMb MB • ${model.quantization} • ${model.license}',
                ),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (!isLoaded)
                      FilledButton(
                        onPressed: () => cubit.loadModelIntoRuntime(model),
                        child: const Text('Load'),
                      )
                    else
                      const Chip(label: Text('Active')),
                    IconButton(
                      icon: const Icon(Icons.delete_outline_rounded),
                      onPressed: () => _confirmDelete(context, model, cubit),
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  void _confirmDelete(
    BuildContext context,
    AiModelEntity model,
    ModelManagerCubit cubit,
  ) {
    showDialog<void>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: Text('Delete ${model.name}?'),
        content: Text(
          'This will permanently remove the model file (${(model.fileSizeBytes / (1024 * 1024)).toStringAsFixed(1)} MB) from local app storage.\n\nYour library, progress, and reading annotations are not affected.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(dialogCtx).colorScheme.error,
            ),
            onPressed: () {
              Navigator.of(dialogCtx).pop();
              cubit.deleteModel(model.id);
            },
            child: const Text('Delete Model'),
          ),
        ],
      ),
    );
  }

  Widget _buildCatalogSection(
    BuildContext context,
    List<AiModelEntity> catalog,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Recommended Mobile Models',
          style: Theme.of(context).textTheme.titleMedium
              ?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 4),
        Text(
          'Curated lightweight models compatible with offline Android inference. Download GGUF weights to your device and import them above.',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        const SizedBox(height: 12),
        ...catalog.map((m) {
          final sizeGb = (m.fileSizeBytes / (1024 * 1024 * 1024))
              .toStringAsFixed(2);
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        m.name,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const Spacer(),
                      Chip(
                        label: Text('Min ${m.recommendedMinRamGb}GB RAM'),
                        visualDensity: VisualDensity.compact,
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Parameters: ${m.parameterSize} • Quantization: ${m.quantization} • Size: ~$sizeGb GB • License: ${m.license}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }
}
