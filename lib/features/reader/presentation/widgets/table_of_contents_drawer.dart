import 'package:flutter/material.dart';
import '../../../library/domain/entities/chapter_entity.dart';

class TableOfContentsDrawer extends StatelessWidget {
  const TableOfContentsDrawer({
    super.key,
    required this.bookTitle,
    required this.chapters,
    required this.currentChapterIndex,
    required this.onChapterSelected,
  });

  final String bookTitle;
  final List<ChapterEntity> chapters;
  final int currentChapterIndex;
  final ValueChanged<int> onChapterSelected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Drawer(
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Table of Contents',
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    bookTitle,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${chapters.length} Chapters',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: ListView.builder(
                itemCount: chapters.length,
                itemBuilder: (context, index) {
                  final chapter = chapters[index];
                  final isCurrent = index == currentChapterIndex;

                  return ListTile(
                    selected: isCurrent,
                    selectedTileColor: theme.colorScheme.primaryContainer.withValues(alpha: 0.4),
                    leading: CircleAvatar(
                      radius: 14,
                      backgroundColor: isCurrent
                          ? theme.colorScheme.primary
                          : theme.colorScheme.surfaceContainerHighest,
                      child: Text(
                        '${index + 1}',
                        style: TextStyle(
                          fontSize: 12,
                          color: isCurrent
                              ? theme.colorScheme.onPrimary
                              : theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                    title: Text(
                      chapter.title,
                      style: TextStyle(
                        fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    subtitle: chapter.wordCount > 0
                        ? Text('${chapter.wordCount} words')
                        : null,
                    onTap: () {
                      Navigator.of(context).pop();
                      onChapterSelected(index);
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
