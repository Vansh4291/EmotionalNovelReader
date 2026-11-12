import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';

import '../../domain/entities/backup_manifest_entity.dart';
import '../cubit/backup_cubit.dart';
import '../cubit/backup_state.dart';

class BackupScreen extends StatefulWidget {
  const BackupScreen({super.key});

  @override
  State<BackupScreen> createState() => _BackupScreenState();
}

class _BackupScreenState extends State<BackupScreen> {
  bool _includeBookFiles = true;
  RestoreConflictMode _conflictMode = RestoreConflictMode.merge;
  File? _inspectedFile;
  BackupManifestEntity? _inspectedManifest;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Backup & Restore')),
      body: BlocConsumer<BackupCubit, BackupState>(
        listener: (context, state) {
          if (state is BackupFailureState) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: colorScheme.error,
              ),
            );
          } else if (state is BackupExportSuccess) {
            _showExportSuccessDialog(context, state);
          } else if (state is BackupInspectSuccess) {
            setState(() {
              _inspectedFile = state.backupFile;
              _inspectedManifest = state.manifest;
            });
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Backup archive verified successfully'),
              ),
            );
          } else if (state is BackupRestoreSuccess) {
            _showRestoreSuccessDialog(context, state.summary);
            setState(() {
              _inspectedFile = null;
              _inspectedManifest = null;
            });
          }
        },
        builder: (context, state) {
          final isLoading = state is BackupLoading;
          final loadingMessage = state is BackupLoading ? state.message : '';

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _buildWarningCard(context),
              const SizedBox(height: 16),
              if (isLoading) ...[
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  child: Column(
                    children: [
                      const CircularProgressIndicator(),
                      const SizedBox(height: 16),
                      Text(
                        loadingMessage,
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
              ] else ...[
                _buildExportSection(context),
                const SizedBox(height: 24),
                const Divider(),
                const SizedBox(height: 16),
                _buildRestoreSection(context),
              ],
            ],
          );
        },
      ),
    );
  }

  Widget _buildWarningCard(BuildContext context) {
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
            Icon(Icons.shield_outlined, color: colorScheme.primary, size: 28),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Unencrypted Local Backups',
                    style: Theme.of(context).textTheme.titleSmall
                        ?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Exported backups are unencrypted so you can freely inspect and migrate your personal data. Keep exported .enrbk files stored securely.',
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

  Widget _buildExportSection(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Export Backup',
              style: Theme.of(context).textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Archive your books, reading progress, highlights, notes, and reading statistics into a portable backup file.',
              style: Theme.of(context).textTheme.bodySmall
                  ?.copyWith(color: colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 12),
            SwitchListTile.adaptive(
              contentPadding: EdgeInsets.zero,
              title: const Text('Include Book Source Files'),
              subtitle: const Text(
                'Include original book files inside the archive',
              ),
              value: _includeBookFiles,
              onChanged: (val) {
                setState(() {
                  _includeBookFiles = val;
                });
              },
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                icon: const Icon(Icons.archive_outlined),
                label: const Text('Create Backup Archive'),
                onPressed: () => _confirmExport(context),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmExport(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: const Text('Export Unencrypted Backup?'),
        content: const Text(
          'This will generate an unencrypted .enrbk archive containing your library database and reading data.\n\nAnyone who obtains this file can view its contents.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(dialogCtx).pop();
              context.read<BackupCubit>().exportBackup(
                includeBookFiles: _includeBookFiles,
              );
            },
            child: const Text('Export Backup'),
          ),
        ],
      ),
    );
  }

  Widget _buildRestoreSection(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Restore Backup',
              style: Theme.of(context).textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Select an .enrbk backup archive to verify its integrity and restore your library.',
              style: Theme.of(context).textTheme.bodySmall
                  ?.copyWith(color: colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                icon: const Icon(Icons.folder_open_outlined),
                label: Text(
                  _inspectedFile == null
                      ? 'Select Backup File (.enrbk)'
                      : 'Choose Different File',
                ),
                onPressed: () {
                  context.read<BackupCubit>().pickAndInspectBackup();
                },
              ),
            ),
            if (_inspectedManifest != null && _inspectedFile != null) ...[
              const SizedBox(height: 16),
              _buildInspectedManifestCard(
                context,
                _inspectedManifest!,
                _inspectedFile!,
              ),
              const SizedBox(height: 16),
              _buildConflictModeSelector(context),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  style: _conflictMode == RestoreConflictMode.replace
                      ? FilledButton.styleFrom(
                          backgroundColor: colorScheme.error,
                          foregroundColor: colorScheme.onError,
                        )
                      : null,
                  icon: const Icon(Icons.restore_outlined),
                  label: Text(
                    _conflictMode == RestoreConflictMode.replace
                        ? 'Replace Library & Restore'
                        : 'Merge & Restore',
                  ),
                  onPressed: () => _confirmRestore(context),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildInspectedManifestCard(
    BuildContext context,
    BackupManifestEntity manifest,
    File file,
  ) {
    final colorScheme = Theme.of(context).colorScheme;
    final dateStr = DateFormat('yyyy-MM-dd HH:mm')
        .format(manifest.createdAt.toLocal());
    final sizeKb = (file.lengthSync() / 1024).toStringAsFixed(1);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: colorScheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.check_circle_outline,
                color: colorScheme.primary,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                'Archive Verified',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: colorScheme.primary,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              Text('$sizeKb KB', style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Created: $dateStr • App v${manifest.appVersion} (Schema v${manifest.databaseSchemaVersion})',
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              _buildChip('${manifest.bookCount} Books'),
              _buildChip('${manifest.chapterCount} Chapters'),
              _buildChip('${manifest.bookmarkCount} Bookmarks'),
              _buildChip('${manifest.highlightCount} Highlights'),
              _buildChip('${manifest.noteCount} Notes'),
              _buildChip('${manifest.sessionCount} Sessions'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildChip(String label) {
    return Chip(
      label: Text(label, style: const TextStyle(fontSize: 12)),
      padding: EdgeInsets.zero,
      visualDensity: VisualDensity.compact,
    );
  }

  Widget _buildConflictModeSelector(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Restore Mode',
          style: Theme.of(context).textTheme.bodyMedium
              ?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: SegmentedButton<RestoreConflictMode>(
            segments: const [
              ButtonSegment<RestoreConflictMode>(
                value: RestoreConflictMode.merge,
                icon: Icon(Icons.merge_type),
                label: Text('Merge'),
              ),
              ButtonSegment<RestoreConflictMode>(
                value: RestoreConflictMode.replace,
                icon: Icon(Icons.delete_sweep_outlined),
                label: Text('Replace'),
              ),
            ],
            selected: {_conflictMode},
            onSelectionChanged: (selected) {
              if (selected.isNotEmpty) {
                setState(() => _conflictMode = selected.first);
              }
            },
          ),
        ),
        const SizedBox(height: 6),
        Text(
          _conflictMode == RestoreConflictMode.merge
              ? 'Merge: Adds new items and updates conflicts without deleting existing books.'
              : 'Replace: Erases current local library before restoring backup contents.',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: _conflictMode == RestoreConflictMode.replace
                ? Theme.of(context).colorScheme.error
                : Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  void _confirmRestore(BuildContext context) {
    if (_inspectedFile == null) return;

    if (_conflictMode == RestoreConflictMode.replace) {
      showDialog<void>(
        context: context,
        builder: (dialogCtx) => AlertDialog(
          title: const Text('Replace Entire Library?'),
          content: const Text(
            'This action is destructive.\n\nAll existing books, bookmarks, highlights, notes, and reading sessions will be erased and replaced with the backup archive contents.',
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
                context.read<BackupCubit>().restoreBackup(
                  backupFile: _inspectedFile!,
                  conflictMode: RestoreConflictMode.replace,
                );
              },
              child: const Text('Replace Everything'),
            ),
          ],
        ),
      );
    } else {
      context.read<BackupCubit>().restoreBackup(
        backupFile: _inspectedFile!,
        conflictMode: RestoreConflictMode.merge,
      );
    }
  }

  void _showExportSuccessDialog(
    BuildContext context,
    BackupExportSuccess state,
  ) {
    showDialog<void>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: const Text('Backup Created Successfully'),
        content: Text(
          'Backup archive saved:\n${state.backupFile.path}\n\n'
          'Contents:\n'
          '• ${state.manifest.bookCount} Books\n'
          '• ${state.manifest.chapterCount} Chapters\n'
          '• ${state.manifest.bookmarkCount} Bookmarks\n'
          '• ${state.manifest.highlightCount} Highlights\n'
          '• ${state.manifest.noteCount} Notes\n'
          '• ${state.manifest.sessionCount} Reading Sessions',
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _showRestoreSuccessDialog(
    BuildContext context,
    BackupRestoreSummary summary,
  ) {
    showDialog<void>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: const Text('Restore Completed'),
        content: Text(
          'Library data has been restored:\n\n'
          '• ${summary.restoredBooksCount} Books\n'
          '• ${summary.restoredChaptersCount} Chapters\n'
          '• ${summary.restoredBookmarksCount} Bookmarks\n'
          '• ${summary.restoredHighlightsCount} Highlights\n'
          '• ${summary.restoredNotesCount} Notes\n'
          '• ${summary.restoredSessionsCount} Reading Sessions',
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }
}
