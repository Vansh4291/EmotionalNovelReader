import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../app/di/injection.dart';
import '../../../../core/presentation/widgets/error_view.dart';
import '../../../../core/presentation/widgets/loading_view.dart';
import '../../../annotations/domain/entities/highlight_entity.dart';
import '../../../annotations/presentation/cubit/annotation_cubit.dart';
import '../../../ai/presentation/cubit/ai_chat_cubit.dart';
import '../../../ai/presentation/widgets/ai_companion_sheet.dart';
import '../../../annotations/presentation/widgets/annotations_sheet.dart';
import '../../../annotations/presentation/widgets/note_editor_dialog.dart';
import '../../domain/entities/reader_preferences.dart';
import '../../../tts/domain/entities/tts_entities.dart';
import '../../../tts/presentation/cubit/tts_cubit.dart';
import '../../../tts/presentation/widgets/tts_control_sheet.dart';
import '../cubit/reader_cubit.dart';
import '../cubit/reader_state.dart';
import '../services/reader_scroll_mapper.dart';
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

    final validHighlights =
        highlights
            .where(
              (h) =>
                  h.startOffset >= 0 &&
                  h.endOffset <= content.length &&
                  h.startOffset < h.endOffset,
            )
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
      spans.add(TextSpan(text: content.substring(cursor), style: baseStyle));
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
  String? _lastHandledNavigationRequestId;
  late final TtsCubit _ttsCubit;
  AiChatCubit? _aiChatCubit;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _ttsCubit = getIt<TtsCubit>()..initialize();
    _ttsCubit.onSentenceChanged = (sentence) {
      final readerState = context.read<ReaderCubit>().state;
      if (readerState is ReaderLoaded) {
        _onTtsSentenceChanged(sentence, readerState);
      }
    };
    _ttsCubit.onChapterCompleted = () {
      final readerCubit = context.read<ReaderCubit>();
      final state = readerCubit.state;
      if (state is ReaderLoaded && state.hasNextChapter) {
        readerCubit.nextChapter();
      }
    };
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
    _ttsCubit.close();
    _aiChatCubit?.close();
    super.dispose();
  }

  void _openAiCompanion(ReaderLoaded state) {
    _aiChatCubit ??= getIt<AiChatCubit>(
      param1: (
        bookId: state.book.id,
        bookTitle: state.book.title,
        currentChapterIndex: state.currentChapterIndex,
      ),
    );
    _aiChatCubit!.updatePosition(state.currentChapterIndex);
    AiCompanionSheet.show(
      context: context,
      cubit: _aiChatCubit!,
      currentChapterExcerpt: state.currentChapter.content,
    );
  }

  void _onTtsSentenceChanged(TtsSentence sentence, ReaderLoaded state) {
    if (!_scrollController.hasClients) return;
    final width =
        MediaQuery.of(context).size.width -
        (state.preferences.horizontalMargin * 2);
    final headerH = _measureHeaderHeight(state, width);
    final targetY = ReaderScrollMapper.calculatePixelOffset(
      content: state.currentChapter.content,
      charOffset: sentence.charStart,
      textStyle: TextStyle(
        fontSize: state.preferences.fontSize,
        height: state.preferences.lineHeight,
      ),
      contentWidth: width,
      headerHeight: headerH,
    );
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        targetY.clamp(0.0, _scrollController.position.maxScrollExtent),
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive) {
      context.read<ReaderCubit>().pauseReading();
      context.read<ReaderCubit>().flushProgress();
    } else if (state == AppLifecycleState.resumed) {
      context.read<ReaderCubit>().resumeReading();
    }
  }

  double _measureHeaderHeight(ReaderLoaded state, double width) {
    final titlePainter = TextPainter(
      text: TextSpan(
        text: state.currentChapter.title,
        style: TextStyle(
          fontSize: state.preferences.fontSize + 6,
          fontWeight: FontWeight.bold,
        ),
      ),
      textDirection: TextDirection.ltr,
    );
    titlePainter.layout(maxWidth: width);
    final titleH = titlePainter.height;
    titlePainter.dispose();
    return 24.0 + titleH + 16.0 + 16.0 + 20.0;
  }

  void _onScroll() {
    // Only record user scroll movements after initial position has been restored
    if (!_initialScrollRestored) return;
    if (_scrollController.hasClients) {
      final state = context.read<ReaderCubit>().state;
      if (state is ReaderLoaded) {
        final width =
            MediaQuery.of(context).size.width -
            (state.preferences.horizontalMargin * 2);
        final headerHeight = _measureHeaderHeight(state, width);
        final baseStyle = TextStyle(
          fontSize: state.preferences.fontSize,
          height: state.preferences.lineHeight,
          letterSpacing: 0.2,
        );
        final charOffset = ReaderScrollMapper.calculateCharOffset(
          content: state.currentChapter.content,
          scrollOffset: _scrollController.offset,
          textStyle: baseStyle,
          contentWidth: width,
          headerHeight: headerHeight,
        );
        context.read<ReaderCubit>().updateScrollPosition(
          _scrollController.offset,
          visibleCharOffset: charOffset,
        );
      }
    }
  }

  void _scrollToLocation(String location, ReaderLoaded state) {
    final parsed = ReaderScrollMapper.parseLocation(location);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      final width =
          MediaQuery.of(context).size.width -
          (state.preferences.horizontalMargin * 2);

      double targetPixel;
      if (parsed.isCharOffset) {
        final baseStyle = TextStyle(
          fontSize: state.preferences.fontSize,
          height: state.preferences.lineHeight,
          letterSpacing: 0.2,
        );
        final headerHeight = _measureHeaderHeight(state, width);
        targetPixel = ReaderScrollMapper.calculatePixelOffset(
          content: state.currentChapter.content,
          charOffset: parsed.charOffset,
          textStyle: baseStyle,
          contentWidth: width,
          headerHeight: headerHeight,
        );
      } else {
        targetPixel = parsed.pixelOffset;
      }

      final maxExtent = _scrollController.position.maxScrollExtent;
      _scrollController.jumpTo(targetPixel.clamp(0.0, maxExtent));
    });
  }

  void _restoreScrollPosition(String? location, ReaderLoaded state) {
    if (_initialScrollRestored || location == null) return;
    _initialScrollRestored = true;
    _scrollToLocation(location, state);
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
          if (!_initialScrollRestored) {
            _restoreScrollPosition(state.progress?.currentLocation, state);
          }
          if (state.navigationRequest != null &&
              state.navigationRequest!.requestId !=
                  _lastHandledNavigationRequestId) {
            _lastHandledNavigationRequestId =
                state.navigationRequest!.requestId;
            _scrollToLocation(state.navigationRequest!.targetLocation, state);
            context.read<ReaderCubit>().clearNavigationRequest();
          }
          if (_ttsCubit.state.chapterId != state.currentChapter.id) {
            _ttsCubit.loadChapter(
              bookId: state.book.id,
              bookTitle: state.book.title,
              chapterId: state.currentChapter.id,
              chapterTitle: state.currentChapter.title,
              content: state.currentChapter.content,
              autoPlay: _ttsCubit.state.isPlaying,
            );
          }
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
    final (bgColor, textColor) = _resolveThemeColors(
      context,
      state.preferences.themeMode,
    );
    final isDark =
        Theme.of(context).brightness == Brightness.dark ||
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
                      : 'Bookmark Current Location',
                  onPressed: () {
                    context.read<ReaderCubit>().toggleBookmark();
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.note_add_outlined),
                  tooltip: 'Add Chapter Note',
                  onPressed: () async {
                    final result = await NoteEditorDialog.show(
                      context: context,
                      selectedText: state.currentChapter.title,
                      title: 'Add Chapter Note',
                    );
                    if (result != null &&
                        result.note.trim().isNotEmpty &&
                        context.mounted) {
                      final annCubit = getIt<AnnotationCubit>();
                      await annCubit.createChapterNote(
                        chapterId: state.currentChapter.id,
                        chapterIndex: state.currentChapterIndex,
                        chapterTitle: state.currentChapter.title,
                        content: result.note,
                      );
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Chapter note saved'),
                            duration: Duration(seconds: 2),
                          ),
                        );
                      }
                    }
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.collections_bookmark_rounded),
                  tooltip: 'Bookmarks & Highlights',
                  onPressed: () async {
                    await AnnotationsSheet.show(
                      context: context,
                      bookId: state.book.id,
                      currentChapterId: state.currentChapter.id,
                      currentChapterIndex: state.currentChapterIndex,
                      currentChapterTitle: state.currentChapter.title,
                      onNavigate: (chapterIndex, location) {
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
                  icon: const Icon(Icons.record_voice_over_rounded),
                  tooltip: 'Read Aloud (TTS)',
                  onPressed: () {
                    if (_ttsCubit.state.chapterId != state.currentChapter.id) {
                      _ttsCubit.loadChapter(
                        bookId: state.book.id,
                        bookTitle: state.book.title,
                        chapterId: state.currentChapter.id,
                        chapterTitle: state.currentChapter.title,
                        content: state.currentChapter.content,
                      );
                    }
                    TtsControlSheet.show(context, _ttsCubit);
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.auto_awesome_rounded),
                  tooltip: 'AI Reading Companion',
                  onPressed: () => _openAiCompanion(state),
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
      bottomNavigationBar: state.isControlsVisible
          ? _buildBottomBar(context, state)
          : null,
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
                    return _buildContextMenu(context, editableTextState, state);
                  },
                ),
                const SizedBox(height: 60),

                // End of Chapter Navigation Buttons
                Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 8,
                  runSpacing: 8,
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
