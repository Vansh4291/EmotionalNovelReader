import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const ListTile(
            leading: Icon(Icons.shield_outlined),
            title: Text('Privacy & Security'),
            subtitle: Text(
              '100% offline-first. No remote telemetry or tracking.',
            ),
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.backup_outlined),
            title: const Text('Backup & Restore'),
            subtitle: const Text(
              'Export or restore library, progress, and annotations.',
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/backup'),
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.psychology_outlined),
            title: const Text('Local AI & Models'),
            subtitle: const Text(
              'On-device GGUF LLMs for private literary companion.',
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/ai-models'),
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.cloud_outlined),
            title: const Text('Cloud AI (Optional)'),
            subtitle: const Text(
              'User-configured remote LLM endpoint. Disabled by default.',
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/cloud-ai'),
          ),
          const Divider(),
          const ListTile(
            leading: Icon(Icons.storage_outlined),
            title: Text('Storage Location'),
            subtitle: Text('App-sandboxed library storage.'),
          ),
          const Divider(),
          const ListTile(
            leading: Icon(Icons.info_outline),
            title: Text('Application Version'),
            subtitle: Text('1.0.0+1 (Android API 31+)'),
          ),
        ],
      ),
    );
  }
}
