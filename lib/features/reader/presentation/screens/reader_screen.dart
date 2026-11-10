import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/presentation/widgets/error_view.dart';
import '../../../../core/presentation/widgets/loading_view.dart';
import '../../../annotations/domain/entities/highlight_entity.dart';
import '../../../annotations/presentation/widgets/annotations_sheet.dart';
import '../../../annotations/presentation/widgets/note_editor_dialog.dart';
import '../../domain/entities/reader_preferences.dart';
import '../cubit/reader_cubit.dart';
import '../cubit/reader_state.dart';
import '../widgets/reader_preferences_sheet.dart';
import '../widgets/table_of_contents_drawer.dart';

class ReaderScreen extends StatefulWidget {
  const ReaderScreen({
    super.key,
    required this.bookId,
    this.initialChapterIndex,
  });

  final String bookId;
  final int? initialChapterIndex;

  static List<InlineSpan> buildHighlightedSpans({
    required String content,
    required List<HighlightEntity> highlights,
    required TextStyle baseStyle,
  }) {
    if (highlights.isEmpty) {
      return [TextSpan(text: content, style: baseStyle)];
    }

    final validHighlights = highlights
        .where((h) =>
            h.startOffset >= 0 &&
            h.endOffset <= content.length &&
            h.startOffset < h.endOffset)
        .toList()
      ..sort((a, b) {
        final cmp = a.startOffset.compareTo(b.startOffset);
        if (cmp != 0) return cmp;
        return a.endOffset.compareTo(b.endOffset);
      });

    if (validHighlights.isEmpty) {
      return [TextSpan(text: content, style: baseStyle)];
    }

    final List<InlineSpan> spans = [];
    int cursor = 0;

    for (final h in validHighlights) {
      if (h.endOffset <= cursor) {
        continue;
      }

      if (h.startOffset > cursor) {
        spans.add(
          TextSpan(
            text: content.substring(cursor, h.startOffset),
            style: baseStyle,
          ),
        );
        cursor = h.startOffset;
      }

      final effectiveStart = cursor;
      final effectiveEnd = h.endOffset.clamp(0, content.length);

      if (effectiveEnd > effectiveStart) {
        final highlightedText = content.substring(effectiveStart, effectiveEnd);
        spans.add(
          TextSpan(
            text: highlightedText,
            style: baseStyle.copyWith(
              backgroundColor: Color(h.colorValue).withValues(alpha: 0.45),
              decoration: h.hasNote ? TextDecoration.underline : null,
              decorationStyle: h.hasNote ? TextDecorationStyle.dotted : null,
              decorationColor: h.hasNote ? Colors.black87 : null,
              decorationThickness: h.hasNote ? 2.0 : null,
            ),
          ),
        );
        cursor = effectiveEnd;
      }
    }

    if (cursor < content.length) {
      spans.add(
        TextSpan(
          text: content.substring(cursor),
          style: baseStyle,
        ),
      );
    }

    return spans;
  }

  @override
  State<ReaderScreen> createState() => _ReaderScreenState();
}

class _ReaderScreenState extends State<ReaderScreen>
    with WidgetsBindingObserver {
  final ScrollController _scrollController = ScrollController();
  bool _initialScrollRestored = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    context.read<ReaderCubit>().loadBook(
          widget.bookId,
          initialChapterIndex: widget.initialChapterIndex,
        );
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive) {
      context.read<ReaderCubit>().flushProgress();
    }
  }

  void _onScroll() {
    // Only record user scroll movements after initial position has been restored
    if (!_initialScrollRestored) return;
    if (_scrollController.hasClients) {
      context
          .read<ReaderCubit>()
          .updateScrollPosition(_scrollController.offset);
    }
  }

  void _restoreScrollPosition(String? location) {
    if (_initialScrollRestored || location == null) return;
    final offset = double.tryParse(location);
    if (offset != null && offset > 0) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scrollController.hasClients) {
          _scrollController.jumpTo(
            offset.clamp(0.0, _scrollController.position.maxScrollExtent),
          );
          _initialScrollRestored = true;
        }
      });
    } else {
      _initialScrollRestored = true;
    }
  }

  (Color backgroundColor, Color textColor) _resolveThemeColors(
    BuildContext context,
    ReaderThemeMode mode,
  ) {
    final theme = Theme.of(context);
    return switch (mode) {
      ReaderThemeMode.light => (
          const Color(0xFFFAF9F6),
          const Color(0xFF1E1E1E),
        ),
      ReaderThemeMode.dark => (
          const Color(0xFF121212),
          const Color(0xFFE0E0E0),
        ),
      ReaderThemeMode.sepia => (
          const Color(0xFFFBF0D9),
          const Color(0xFF5F4B32),
        ),
      ReaderThemeMode.system => (
          theme.colorScheme.surface,
          theme.colorScheme.onSurface,
        ),
    };
  }

  Widget _buildContextMenu(
    BuildContext context,
    EditableTextState editableTextState,
    ReaderLoaded state,
  ) {
    final textEditingValue = editableTextState.textEditingValue;
    final selection = textEditingValue.selection;
    final defaultItems = editableTextState.contextMenuButtonItems;

    if (!selection.isValid || selection.isCollapsed) {
      return AdaptiveTextSelectionToolbar.buttonItems(
        anchors: editableTextState.contextMenuAnchors,
        buttonItems: defaultItems,
      );
    }

    final selectedText = textEditingValue.text.substring(
      selection.start,
      selection.end,
    );

    final customItems = <ContextMenuButtonItem>[
      ContextMenuButtonItem(
        label: 'Highlight',
        onPressed: () async {
          editableTextState.hideToolbar();
          await context.read<ReaderCubit>().addHighlight(
                startOffset: selection.start,
                endOffset: selection.end,
                selectedText: selectedText,
              );
        },
      ),
      ContextMenuButtonItem(
        label: 'Add Note',
        onPressed: () async {
          editableTextState.hideToolbar();
          final result = await NoteEditorDialog.show(
            context: context,
            selectedText: selectedText,
            title: 'Add Note',
          );
          if (result != null && context.mounted) {
            await context.read<ReaderCubit>().addHighlight(
                  startOffset: selection.start,
                  endOffset: selection.end,
                  selectedText: selectedText,
                  note: result.note,
                  colorValue: result.colorValue,
                );
          }
        },
      ),
      ...defaultItems,
    ];

    return AdaptiveTextSelectionToolbar.buttonItems(
      anchors: editableTextState.contextMenuAnchors,
      buttonItems: customItems,
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<ReaderCubit, ReaderState>(
      listener: (context, state) {
        if (state is ReaderLoaded) {
          _restoreScrollPosition(state.progress?.currentLocation);
        }
      },
      builder: (context, state) {
        return switch (state) {
          ReaderInitial() || ReaderLoading() => const Scaffold(
              body: LoadingView(message: 'Opening novel...'),
            ),
          ReaderError(:final message) => Scaffold(
              appBar: AppBar(title: const Text('Reader')),
              body: ErrorView(
                message: message,
                onRetry: () =>
                    context.read<ReaderCubit>().loadBook(widget.bookId),
              ),
            ),
          ReaderLoaded() => _buildReaderScaffold(context, state),
        };
      },
    );
  }

  Widget _buildReaderScaffold(BuildContext context, ReaderLoaded state) {
    final (bgColor, textColor) =
        _resolveThemeColors(context, state.preferences.themeMode);
    final isDark = Theme.of(context).brightness == Brightness.dark ||
        state.preferences.themeMode == ReaderThemeMode.dark;

    return Scaffold(
      backgroundColor: bgColor,
      drawer: TableOfContentsDrawer(
        bookTitle: state.book.title,
        chapters: state.chapters,
        currentChapterIndex: state.currentChapterIndex,
        onChapterSelected: (index) {
          _scrollController.jumpTo(0.0);
          context.read<ReaderCubit>().goToChapter(index);
        },
      ),
      appBar: state.isControlsVisible
          ? AppBar(
              title: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    state.book.title,
                    style: const TextStyle(fontSize: 16),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    state.currentChapter.title,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.white70 : Colors.black54,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
              actions: [
                IconButton(
                  icon: Icon(
                    state.isCurrentChapterBookmarked
                        ? Icons.bookmark
                        : Icons.bookmark_border_rounded,
                    color: state.isCurrentChapterBookmarked
                        ? Theme.of(context).colorScheme.primary
                        : null,
                  ),
                  tooltip: state.isCurrentChapterBookmarked
                      ? 'Remove Bookmark'
                      : 'Bookmark Chapter',
                  onPressed: () {
                    context.read<ReaderCubit>().toggleBookmark();
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.collections_bookmark_rounded),
                  tooltip: 'Bookmarks & Highlights',
                  onPressed: () async {
                    await AnnotationsSheet.show(
                      context: context,
                      bookId: state.book.id,
                      onNavigate: (chapterIndex, location) {
                        _scrollController.jumpTo(0.0);
                        context.read<ReaderCubit>().goToChapter(
                              chapterIndex,
                              targetLocation: location,
                            );
                      },
                    );
                    if (context.mounted) {
                      await context.read<ReaderCubit>().reloadAnnotations();
                    }
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.search_rounded),
                  tooltip: 'Search in Book',
                  onPressed: () {
                    context.push('/search?bookId=${state.book.id}');
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.format_size_rounded),
                  tooltip: 'Text and Display Settings',
                  onPressed: () {
                    showModalBottomSheet<void>(
                      context: context,
                      builder: (ctx) => ReaderPreferencesSheet(
                        preferences: state.preferences,
                        onChanged: (prefs) {
                          context.read<ReaderCubit>().updatePreferences(prefs);
                        },
                      ),
                    );
                  },
                ),
              ],
            )
          : null,
      bottomNavigationBar:
          state.isControlsVisible ? _buildBottomBar(context, state) : null,
      body: GestureDetector(
        behavior: HitTestBehavior.translucent,
        onTap: () => context.read<ReaderCubit>().toggleControls(),
        child: SafeArea(
          child: SingleChildScrollView(
            controller: _scrollController,
            padding: EdgeInsets.symmetric(
              horizontal: state.preferences.horizontalMargin,
              vertical: 24,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Chapter Header
                Text(
                  state.currentChapter.title,
                  style: TextStyle(
                    fontSize: state.preferences.fontSize + 6,
                    fontWeight: FontWeight.bold,
                    color: textColor,
                  ),
                ),
                const SizedBox(height: 16),
                const Divider(),
                const SizedBox(height: 20),

                // Chapter Content with Persistent Highlights & Context Menu
                SelectableText.rich(
                  TextSpan(
                    children: ReaderScreen.buildHighlightedSpans(
                      content: state.currentChapter.content,
                      highlights: state.highlights,
                      baseStyle: TextStyle(
                        fontSize: state.preferences.fontSize,
                        height: state.preferences.lineHeight,
                        color: textColor,
                        letterSpacing: 0.2,
                      ),
                    ),
                  ),
                  contextMenuBuilder: (context, editableTextState) {
                    return _buildContextMenu(
                      context,
                      editableTextState,
                      state,
                    );
                  },
                ),
                const SizedBox(height: 60),

                // End of Chapter Navigation Buttons
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    TextButton.icon(
                      onPressed: state.hasPreviousChapter
                          ? () {
                              _scrollController.jumpTo(0.0);
                              context.read<ReaderCubit>().previousChapter();
                            }
                          : null,
                      icon: const Icon(Icons.arrow_back),
                      label: const Text('Previous Chapter'),
                    ),
                    TextButton.icon(
                      onPressed: state.hasNextChapter
                          ? () {
                              _scrollController.jumpTo(0.0);
                              context.read<ReaderCubit>().nextChapter();
                            }
                          : null,
                      icon: const Icon(Icons.arrow_forward),
                      label: const Text('Next Chapter'),
                    ),
                  ],
                ),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBottomBar(BuildContext context, ReaderLoaded state) {
    final theme = Theme.of(context);

    return Container(
      color: theme.colorScheme.surface,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.skip_previous_rounded),
                  tooltip: 'Previous Chapter',
                  onPressed: state.hasPreviousChapter
                      ? () {
                          _scrollController.jumpTo(0.0);
                          context.read<ReaderCubit>().previousChapter();
                        }
                      : null,
                ),
                Expanded(
                  child: Column(
                    children: [
                      LinearProgressIndicator(
                        value: state.overallProgress,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Chapter ${state.currentChapterIndex + 1} of ${state.chapters.length} (${(state.overallProgress * 100).toInt()}%)',
                        style: theme.textTheme.labelSmall,
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.skip_next_rounded),
                  tooltip: 'Next Chapter',
                  onPressed: state.hasNextChapter
                      ? () {
                          _scrollController.jumpTo(0.0);
                          context.read<ReaderCubit>().nextChapter();
                        }
                      : null,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
