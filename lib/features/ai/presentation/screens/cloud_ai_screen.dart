import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/entities/cloud_ai_config.dart';
import '../cubit/cloud_ai_cubit.dart';
import '../cubit/cloud_ai_state.dart';

class CloudAiScreen extends StatefulWidget {
  const CloudAiScreen({super.key});

  @override
  State<CloudAiScreen> createState() => _CloudAiScreenState();
}

class _CloudAiScreenState extends State<CloudAiScreen> {
  final _apiKeyController = TextEditingController();
  late TextEditingController _endpointController;
  late TextEditingController _modelController;

  @override
  void initState() {
    super.initState();
    final config = context.read<CloudAiCubit>().state.config;
    _endpointController = TextEditingController(text: config.endpointUrl);
    _modelController = TextEditingController(text: config.modelName);
  }

  @override
  void dispose() {
    _apiKeyController.dispose();
    _endpointController.dispose();
    _modelController.dispose();
    super.dispose();
  }

  void _showConsentDialog(BuildContext context) {
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        icon: const Icon(Icons.cloud_sync, size: 36),
        title: const Text('External Data Transfer Consent'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'EmotionalNovelReader is built with an offline-first privacy architecture.',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 12),
            Text(
              'If you enable Cloud AI, queries and excerpt passages from your currently read book (bounded strictly to your current reading position) will be transmitted over the internet to your configured remote endpoint.',
            ),
            SizedBox(height: 12),
            Text(
              '• EmotionalNovelReader does not collect, track, or intermediate your queries.\n'
              '• Your API key is stored securely in your device KeyStore.\n'
              '• Core offline reading, search, and local AI never depend on this feature.',
              style: TextStyle(fontSize: 13),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              context.read<CloudAiCubit>().grantConsentAndEnable();
            },
            child: const Text('I Understand & Consent'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Cloud AI (Optional)')),
      body: BlocConsumer<CloudAiCubit, CloudAiState>(
        listener: (context, state) {
          if (state.statusMessage != null) {
            ScaffoldMessenger.of(context)
                .showSnackBar(SnackBar(content: Text(state.statusMessage!)));
          }
          if (state.errorMessage != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.errorMessage!),
                backgroundColor: colorScheme.error,
              ),
            );
          }
        },
        builder: (context, state) {
          final config = state.config;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Card(
                elevation: 0,
                color: colorScheme.surfaceContainerHighest.withAlpha(128),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.shield_outlined, color: colorScheme.primary),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Cloud AI is completely optional and disabled by default. Your reading library, progress, bookmarks, and local GGUF models never require an internet connection or account.',
                          style: TextStyle(
                            fontSize: 13,
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              SwitchListTile.adaptive(
                title: const Text(
                  'Enable Cloud AI',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                subtitle: Text(
                  config.enabled
                      ? 'Enabled (Explicit consent granted)'
                      : 'Disabled (100% offline mode active)',
                ),
                value: config.enabled,
                onChanged: (val) {
                  if (val) {
                    _showConsentDialog(context);
                  } else {
                    context.read<CloudAiCubit>().disableCloudAi();
                  }
                },
              ),
              const Divider(height: 32),
              Text(
                'Provider Settings',
                style: Theme.of(context).textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              SegmentedButton<CloudAiProvider>(
                segments: const [
                  ButtonSegment(
                    value: CloudAiProvider.openAiCompatible,
                    label: Text('OpenAI / Custom'),
                  ),
                  ButtonSegment(
                    value: CloudAiProvider.googleGemini,
                    label: Text('Google Gemini'),
                  ),
                ],
                selected: {config.provider},
                onSelectionChanged: config.enabled
                    ? (selection) {
                        final provider = selection.first;
                        context.read<CloudAiCubit>().updateProvider(provider);
                        _endpointController.text = provider.defaultEndpoint;
                        _modelController.text = provider.defaultModel;
                      }
                    : null,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _endpointController,
                enabled: config.enabled,
                decoration: const InputDecoration(
                  labelText: 'Endpoint URL',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.link),
                  helperText: 'Base URL for REST completions API',
                ),
                onSubmitted: (val) {
                  context.read<CloudAiCubit>().updateEndpoint(val);
                },
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _modelController,
                enabled: config.enabled,
                decoration: const InputDecoration(
                  labelText: 'Model Identifier',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.psychology),
                  helperText: 'e.g. gpt-4o-mini, gemini-1.5-flash',
                ),
                onSubmitted: (val) {
                  context.read<CloudAiCubit>().updateModelName(val);
                },
              ),
              const Divider(height: 32),
              Text(
                'API Key & Authentication',
                style: Theme.of(context).textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              if (config.hasApiKey) ...[
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.check_circle, color: Colors.green),
                  title: const Text('API Key Configured'),
                  subtitle: const Text(
                    'Safely stored in Android EncryptedSharedPreferences',
                  ),
                  trailing: OutlinedButton.icon(
                    icon: const Icon(Icons.delete_outline, size: 18),
                    label: const Text('Remove'),
                    onPressed: () {
                      context.read<CloudAiCubit>().clearApiKey();
                    },
                  ),
                ),
              ] else ...[
                TextField(
                  controller: _apiKeyController,
                  enabled: config.enabled,
                  obscureText: true,
                  decoration: InputDecoration(
                    labelText: 'Enter Provider API Key',
                    border: const OutlineInputBorder(),
                    prefixIcon: const Icon(Icons.key),
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.save),
                      tooltip: 'Save Key',
                      onPressed: () {
                        if (_apiKeyController.text.trim().isNotEmpty) {
                          context.read<CloudAiCubit>().saveApiKey(
                            _apiKeyController.text.trim(),
                          );
                          _apiKeyController.clear();
                        }
                      },
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 24),
              FilledButton.tonalIcon(
                icon: state.isTestingConnection
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.network_check),
                label: const Text('Test Connection'),
                onPressed: config.enabled && !state.isTestingConnection
                    ? () {
                        // Persist any typed endpoint/model before testing
                        context.read<CloudAiCubit>().updateEndpoint(
                          _endpointController.text,
                        );
                        context.read<CloudAiCubit>().updateModelName(
                          _modelController.text,
                        );
                        context.read<CloudAiCubit>().testConnection();
                      }
                    : null,
              ),
              if (state.testResult != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.green.withAlpha(30),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.green),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.check, color: Colors.green, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          state.testResult!,
                          style: const TextStyle(
                            color: Colors.green,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}
