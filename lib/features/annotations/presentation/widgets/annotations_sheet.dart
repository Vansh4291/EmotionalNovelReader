import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../app/di/injection.dart';
import '../../domain/entities/bookmark_entity.dart';
import '../../domain/entities/chapter_note_entity.dart';
import '../../domain/entities/highlight_entity.dart';
import '../cubit/annotation_cubit.dart';
import '../cubit/annotation_state.dart';
import 'note_editor_dialog.dart';

class AnnotationsSheet extends StatelessWidget {
  const AnnotationsSheet({
    super.key,
    required this.onNavigate,
    this.currentChapterId,
    this.currentChapterIndex,
    this.currentChapterTitle,
  });

  final void Function(int chapterIndex, String? location) onNavigate;
  final String? currentChapterId;
  final int? currentChapterIndex;
  final String? currentChapterTitle;

  static Future<void> show({
    required BuildContext context,
    required String bookId,
    required void Function(int chapterIndex, String? location) onNavigate,
    String? currentChapterId,
    int? currentChapterIndex,
    String? currentChapterTitle,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return BlocProvider(
          create: (_) => getIt<AnnotationCubit>()..loadAnnotations(bookId),
          child: AnnotationsSheet(
            onNavigate: onNavigate,
            currentChapterId: currentChapterId,
            currentChapterIndex: currentChapterIndex,
            currentChapterTitle: currentChapterTitle,
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: SafeArea(
        child: Column(
          children: [
            // Drag handle
            const SizedBox(height: 12),
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: theme.colorScheme.onSurfaceVariant.withValues(
                    alpha: 0.4,
                  ),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 8),

            // Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Annotations & Bookmarks',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                      overflow: TextOverflow.ellipsis,
                      maxLines: 1,
                    ),
                  ),
                  if (currentChapterId != null) ...[
                    const SizedBox(width: 8),
                    TextButton.icon(
                      icon: const Icon(Icons.add_comment_outlined, size: 18),
                      label: const Text('Add Note'),
                      onPressed: () async {
                        final res = await NoteEditorDialog.show(
                          context: context,
                          selectedText: currentChapterTitle ?? 'Chapter Note',
                          title: 'Add Chapter Note',
                        );
                        if (res != null &&
                            res.note.trim().isNotEmpty &&
                            context.mounted) {
                          await context
                              .read<AnnotationCubit>()
                              .createChapterNote(
                                chapterId: currentChapterId!,
                                chapterIndex: currentChapterIndex,
                                chapterTitle: currentChapterTitle,
                                content: res.note,
                              );
                        }
                      },
                    ),
                  ],
                  IconButton(
                    icon: const Icon(Icons.close),
                    tooltip: 'Close',
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),

            // Search Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: BlocBuilder<AnnotationCubit, AnnotationState>(
                builder: (context, state) {
                  return TextField(
                    decoration: InputDecoration(
                      hintText: 'Search in annotations...',
                      prefixIcon: const Icon(Icons.search, size: 20),
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onChanged: (val) {
                      context.read<AnnotationCubit>().setSearchQuery(val);
                    },
                  );
                },
              ),
            ),

            // Filter Chips
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: BlocBuilder<AnnotationCubit, AnnotationState>(
                builder: (context, state) {
                  final activeFilter = state is AnnotationLoaded
                      ? state.filter
                      : AnnotationFilter.all;

                  return SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _FilterChip(
                          label: 'All',
                          isSelected: activeFilter == AnnotationFilter.all,
                          onSelected: () => context
                              .read<AnnotationCubit>()
                              .setFilter(AnnotationFilter.all),
                        ),
                        const SizedBox(width: 8),
                        _FilterChip(
                          label: 'Bookmarks',
                          icon: Icons.bookmark_outline,
                          isSelected:
                              activeFilter == AnnotationFilter.bookmarks,
                          onSelected: () => context
                              .read<AnnotationCubit>()
                              .setFilter(AnnotationFilter.bookmarks),
                        ),
                        const SizedBox(width: 8),
                        _FilterChip(
                          label: 'Highlights',
                          icon: Icons.format_paint_outlined,
                          isSelected:
                              activeFilter == AnnotationFilter.highlights,
                          onSelected: () => context
                              .read<AnnotationCubit>()
                              .setFilter(AnnotationFilter.highlights),
                        ),
                        const SizedBox(width: 8),
                        _FilterChip(
                          label: 'Notes',
                          icon: Icons.note_outlined,
                          isSelected: activeFilter == AnnotationFilter.notes,
                          onSelected: () => context
                              .read<AnnotationCubit>()
                              .setFilter(AnnotationFilter.notes),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            const Divider(height: 1),

            // Content List
            Expanded(
              child: BlocBuilder<AnnotationCubit, AnnotationState>(
                builder: (context, state) {
                  if (state is AnnotationLoading ||
                      state is AnnotationInitial) {
                    return const Center(child: CircularProgressIndicator());
                  }

                  if (state is AnnotationError) {
                    return Center(
                      child: Text(
                        'Failed to load annotations: ${state.message}',
                        style: TextStyle(color: theme.colorScheme.error),
                      ),
                    );
                  }

                  if (state is AnnotationLoaded) {
                    final bookmarks = state.displayedBookmarks;
                    final highlights = state.displayedHighlights;
                    final chapterNotes = state.displayedChapterNotes;

                    if (bookmarks.isEmpty &&
                        highlights.isEmpty &&
                        chapterNotes.isEmpty) {
                      return _buildEmptyState(context, state);
                    }

                    return ListView(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      children: [
                        if (bookmarks.isNotEmpty) ...[
                          _buildSectionHeader(
                            context,
                            'Bookmarks (${bookmarks.length})',
                            Icons.bookmark,
                          ),
                          ...bookmarks.map(
                            (b) => _BookmarkTile(
                              bookmark: b,
                              onTap: () {
                                Navigator.of(context).pop();
                                onNavigate(b.chapterIndex ?? 0, b.location);
                              },
                              onDelete: () {
                                context.read<AnnotationCubit>().deleteBookmark(
                                  b.id,
                                );
                              },
                            ),
                          ),
                          const SizedBox(height: 16),
                        ],
                        if (chapterNotes.isNotEmpty) ...[
                          _buildSectionHeader(
                            context,
                            'Chapter Notes (${chapterNotes.length})',
                            Icons.note_alt_outlined,
                          ),
                          ...chapterNotes.map(
                            (cn) => _ChapterNoteTile(
                              chapterNote: cn,
                              onTap: () {
                                Navigator.of(context).pop();
                                onNavigate(cn.chapterIndex ?? 0, 'char:0');
                              },
                              onEdit: () async {
                                final res = await NoteEditorDialog.show(
                                  context: context,
                                  selectedText:
                                      cn.chapterTitle ?? 'Chapter Note',
                                  initialNote: cn.content,
                                  title: 'Edit Chapter Note',
                                );
                                if (res != null &&
                                    res.note.trim().isNotEmpty &&
                                    context.mounted) {
                                  await context
                                      .read<AnnotationCubit>()
                                      .updateChapterNote(cn.id, res.note);
                                }
                              },
                              onDelete: () {
                                context
                                    .read<AnnotationCubit>()
                                    .deleteChapterNote(cn.id);
                              },
                            ),
                          ),
                          const SizedBox(height: 16),
                        ],
                        if (highlights.isNotEmpty) ...[
                          _buildSectionHeader(
                            context,
                            'Highlights & Notes (${highlights.length})',
                            Icons.format_paint,
                          ),
                          ...highlights.map(
                            (h) => _HighlightTile(
                              highlight: h,
                              onTap: () {
                                Navigator.of(context).pop();
                                onNavigate(
                                  h.chapterIndex ?? 0,
                                  'char:${h.startOffset}',
                                );
                              },
                              onDelete: () {
                                context.read<AnnotationCubit>().deleteHighlight(
                                  h.id,
                                );
                              },
                              onEditNote: () async {
                                final res = await NoteEditorDialog.show(
                                  context: context,
                                  selectedText: h.selectedText,
                                  initialNote: h.note,
                                  initialColor: h.colorValue,
                                  title: 'Edit Note',
                                );
                                if (res != null && context.mounted) {
                                  await context
                                      .read<AnnotationCubit>()
                                      .updateNote(h.id, res.note);
                                  if (res.colorValue != h.colorValue &&
                                      context.mounted) {
                                    await context
                                        .read<AnnotationCubit>()
                                        .updateColor(h.id, res.colorValue);
                                  }
                                }
                              },
                            ),
                          ),
                        ],
                      ],
                    );
                  }

                  return const SizedBox.shrink();
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(
    BuildContext context,
    String title,
    IconData icon,
  ) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, top: 4),
      child: Row(
        children: [
          Icon(icon, size: 16, color: theme.colorScheme.primary),
          const SizedBox(width: 6),
          Text(
            title,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.bold,
              color: theme.colorScheme.primary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, AnnotationLoaded state) {
    final theme = Theme.of(context);
    String message = 'No bookmarks or highlights found.';
    if (state.searchQuery.isNotEmpty) {
      message = 'No matching annotations found for "${state.searchQuery}".';
    } else if (state.filter == AnnotationFilter.bookmarks) {
      message = 'No bookmarks added yet.\nTap the bookmark icon while reading.';
    } else if (state.filter == AnnotationFilter.highlights) {
      message =
          'No highlights created yet.\nSelect text while reading to highlight.';
    } else if (state.filter == AnnotationFilter.notes) {
      message = 'No notes written yet.\nAdd a chapter note or attach notes to highlighted passages.';
    }

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.collections_bookmark_outlined,
              size: 48,
              color: theme.colorScheme.outline,
            ),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.outline,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.isSelected,
    required this.onSelected,
    this.icon,
  });

  final String label;
  final bool isSelected;
  final VoidCallback onSelected;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return FilterChip(
      avatar: icon != null
          ? Icon(
              icon,
              size: 16,
              color: isSelected
                  ? theme.colorScheme.onSecondaryContainer
                  : theme.colorScheme.onSurfaceVariant,
            )
          : null,
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => onSelected(),
      showCheckmark: false,
    );
  }
}

class _BookmarkTile extends StatelessWidget {
  const _BookmarkTile({
    required this.bookmark,
    required this.onTap,
    required this.onDelete,
  });

  final BookmarkEntity bookmark;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final title =
        bookmark.chapterTitle ?? 'Chapter ${(bookmark.chapterIndex ?? 0) + 1}';

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4),
      elevation: 0,
      color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: ListTile(
        leading: Icon(Icons.bookmark, color: theme.colorScheme.primary),
        title: Text(
          title,
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        subtitle: bookmark.label != null && bookmark.label!.isNotEmpty
            ? Text(bookmark.label!)
            : Text(
                _formatDate(bookmark.createdAt),
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.outline,
                ),
              ),
        trailing: IconButton(
          icon: const Icon(Icons.delete_outline, size: 20),
          tooltip: 'Delete bookmark',
          onPressed: onDelete,
        ),
        onTap: onTap,
      ),
    );
  }

  String _formatDate(DateTime dt) {
    return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
  }
}

class _HighlightTile extends StatelessWidget {
  const _HighlightTile({
    required this.highlight,
    required this.onTap,
    required this.onDelete,
    required this.onEditNote,
  });

  final HighlightEntity highlight;
  final VoidCallback onTap;
  final VoidCallback onDelete;
  final VoidCallback onEditNote;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final chapterText =
        highlight.chapterTitle ??
        'Chapter ${(highlight.chapterIndex ?? 0) + 1}';

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4),
      elevation: 0,
      color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header row: Chapter and actions
              Row(
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: Color(highlight.colorValue),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      chapterText,
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: theme.colorScheme.outline,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.edit_note, size: 20),
                    tooltip: highlight.hasNote ? 'Edit note' : 'Add note',
                    visualDensity: VisualDensity.compact,
                    onPressed: onEditNote,
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_outline, size: 20),
                    tooltip: 'Delete highlight',
                    visualDensity: VisualDensity.compact,
                    onPressed: onDelete,
                  ),
                ],
              ),
              const SizedBox(height: 6),

              // Highlighted text excerpt
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: Color(highlight.colorValue).withValues(alpha: 0.35),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  highlight.selectedText,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ),

              if (highlight.isAmbiguous) ...[
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.orange.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.warning_amber_rounded,
                        size: 14,
                        color: Colors.orange,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Multiple matching passages found (ambiguous anchor)',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: Colors.orange.shade800,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              if (highlight.isUnresolved) ...[
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.help_outline_rounded,
                        size: 14,
                        color: Colors.red,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Passage text changed or missing',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: Colors.red.shade800,
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              // Attached Note
              if (highlight.hasNote) ...[
                const SizedBox(height: 8),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.note_alt_outlined,
                      size: 16,
                      color: theme.colorScheme.primary,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        highlight.note!,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _ChapterNoteTile extends StatelessWidget {
  const _ChapterNoteTile({
    required this.chapterNote,
    required this.onTap,
    required this.onDelete,
    required this.onEdit,
  });

  final ChapterNoteEntity chapterNote;
  final VoidCallback onTap;
  final VoidCallback onDelete;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final chapterText =
        chapterNote.chapterTitle ??
        'Chapter ${(chapterNote.chapterIndex ?? 0) + 1}';

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4),
      elevation: 0,
      color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.note_alt_outlined,
                    size: 16,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      chapterText,
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: theme.colorScheme.outline,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.edit_note, size: 20),
                    tooltip: 'Edit note',
                    visualDensity: VisualDensity.compact,
                    onPressed: onEdit,
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_outline, size: 20),
                    tooltip: 'Delete note',
                    visualDensity: VisualDensity.compact,
                    onPressed: onDelete,
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                chapterNote.content,
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                _formatDate(chapterNote.updatedAt),
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.outline,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime dt) {
    return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
  }
}
