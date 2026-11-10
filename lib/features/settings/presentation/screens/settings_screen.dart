import 'package:flutter/material.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          ListTile(
            leading: Icon(Icons.shield_outlined),
            title: Text('Privacy & Security'),
            subtitle: Text('100% offline-first. No remote telemetry or tracking.'),
          ),
          Divider(),
          ListTile(
            leading: Icon(Icons.storage_outlined),
            title: Text('Storage Location'),
            subtitle: Text('App-sandboxed library storage.'),
          ),
          Divider(),
          ListTile(
            leading: Icon(Icons.info_outline),
            title: Text('Application Version'),
            subtitle: Text('1.0.0+1 (Android API 31+)'),
          ),
        ],
      ),
    );
  }
}
