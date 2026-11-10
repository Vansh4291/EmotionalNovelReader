import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/logging/app_logger.dart';
import '../../../annotations/domain/entities/bookmark_entity.dart';
import '../../../annotations/domain/entities/highlight_entity.dart';
import '../../../annotations/domain/repositories/annotation_repository.dart';
import '../../../library/domain/entities/reading_progress_entity.dart';
import '../../../library/domain/repositories/book_repository.dart';
import '../../domain/entities/reader_preferences.dart';
import 'reader_state.dart';

/// Cubit managing book reading state, chapter navigation, preferences,
/// debounced progress persistence, bookmarks, and highlights.
class ReaderCubit extends Cubit<ReaderState> {
  ReaderCubit({
    required this.bookRepository,
    required this.logger,
    this.annotationRepository,
  }) : super(const ReaderInitial());

  final BookRepository bookRepository;
  final AppLogger logger;
  final AnnotationRepository? annotationRepository;

  Timer? _debounceTimer;
  ReadingProgressEntity? _pendingProgress;

  Future<void> loadBook(String bookId, {int? initialChapterIndex}) async {
    emit(const ReaderLoading());

    final bookResult = await bookRepository.getBookById(bookId);
    if (bookResult.isError) {
      emit(ReaderError(bookResult.failureOrNull!.message));
      return;
    }
    final book = bookResult.dataOrNull!;

    final chaptersResult = await bookRepository.getChapters(bookId);
    if (chaptersResult.isError) {
      emit(ReaderError(chaptersResult.failureOrNull!.message));
      return;
    }
    final chapters = chaptersResult.dataOrNull!;
    if (chapters.isEmpty) {
      emit(const ReaderError('This book contains no readable chapters.'));
      return;
    }

    final progressResult = await bookRepository.getReadingProgress(bookId);
    final progress = progressResult.dataOrNull;

    var targetChapterIndex = 0;
    if (initialChapterIndex != null &&
        initialChapterIndex >= 0 &&
        initialChapterIndex < chapters.length) {
      targetChapterIndex = initialChapterIndex;
    } else if (progress?.currentChapterId != null) {
      final foundIndex =
          chapters.indexWhere((c) => c.id == progress!.currentChapterId);
      if (foundIndex != -1) {
        targetChapterIndex = foundIndex;
      }
    }

    List<BookmarkEntity> bookmarks = const [];
    List<HighlightEntity> highlights = const [];

    if (annotationRepository != null) {
      final bRes = await annotationRepository!.getBookmarksForBook(bookId);
      if (bRes.isSuccess) {
        bookmarks = bRes.dataOrNull ?? const [];
      }
      final hRes = await annotationRepository!.getHighlightsForChapter(
        bookId: bookId,
        chapterId: chapters[targetChapterIndex].id,
      );
      if (hRes.isSuccess) {
        highlights = hRes.dataOrNull ?? const [];
      }
    }

    emit(
      ReaderLoaded(
        book: book,
        chapters: chapters,
        currentChapterIndex: targetChapterIndex,
        progress: progress,
        bookmarks: bookmarks,
        highlights: highlights,
      ),
    );
  }

  void toggleControls() {
    final s = state;
    if (s is ReaderLoaded) {
      emit(s.copyWith(isControlsVisible: !s.isControlsVisible));
    }
  }

  void setControlsVisible(bool visible) {
    final s = state;
    if (s is ReaderLoaded) {
      emit(s.copyWith(isControlsVisible: visible));
    }
  }

  Future<void> nextChapter() async {
    final s = state;
    if (s is! ReaderLoaded || !s.hasNextChapter) return;
    await goToChapter(s.currentChapterIndex + 1);
  }

  Future<void> previousChapter() async {
    final s = state;
    if (s is! ReaderLoaded || !s.hasPreviousChapter) return;
    await goToChapter(s.currentChapterIndex - 1);
  }

  Future<void> goToChapter(int index, {String? targetLocation}) async {
    final s = state;
    if (s is! ReaderLoaded) return;
    if (index < 0 || index >= s.chapters.length) return;

    // Flush any pending progress save immediately
    await _flushProgressSave();

    final targetChapter = s.chapters[index];
    final progressPercentage = (index + 1) / s.chapters.length;

    final updatedProgress = ReadingProgressEntity(
      bookId: s.book.id,
      currentLocation: targetLocation ?? '0',
      currentChapterId: targetChapter.id,
      progressPercentage: progressPercentage,
      totalSecondsRead: s.progress?.totalSecondsRead ?? 0,
      updatedAt: DateTime.now().toUtc(),
    );

    List<HighlightEntity> highlights = const [];
    if (annotationRepository != null) {
      final hRes = await annotationRepository!.getHighlightsForChapter(
        bookId: s.book.id,
        chapterId: targetChapter.id,
      );
      if (hRes.isSuccess) {
        highlights = hRes.dataOrNull ?? const [];
      }
    }

    emit(
      s.copyWith(
        currentChapterIndex: index,
        progress: updatedProgress,
        highlights: highlights,
      ),
    );

    await bookRepository.saveReadingProgress(updatedProgress);
  }

  void updateScrollPosition(double scrollOffset) {
    final s = state;
    if (s is! ReaderLoaded) return;

    final currentChapter = s.currentChapter;
    final progressPercentage = (s.currentChapterIndex + 1) / s.chapters.length;

    _pendingProgress = ReadingProgressEntity(
      bookId: s.book.id,
      currentLocation: scrollOffset.toStringAsFixed(1),
      currentChapterId: currentChapter.id,
      progressPercentage: progressPercentage,
      totalSecondsRead: s.progress?.totalSecondsRead ?? 0,
      updatedAt: DateTime.now().toUtc(),
    );

    // Debounce SQLite write by 1.5 seconds
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 1500), () {
      _flushProgressSave();
    });
  }

  void updatePreferences(ReaderPreferences prefs) {
    final s = state;
    if (s is ReaderLoaded) {
      emit(s.copyWith(preferences: prefs));
    }
  }

  Future<void> toggleBookmark({String? label, String? location}) async {
    final s = state;
    if (s is! ReaderLoaded || annotationRepository == null) return;

    final currentChapter = s.currentChapter;
    final isBookmarked = s.isCurrentChapterBookmarked;

    if (isBookmarked) {
      final res = await annotationRepository!.deleteBookmarkForChapter(
        bookId: s.book.id,
        chapterId: currentChapter.id,
      );
      if (res.isSuccess) {
        final updated = s.bookmarks
            .where((b) =>
                b.chapterId != currentChapter.id &&
                b.chapterIndex != s.currentChapterIndex)
            .toList(growable: false);
        emit(s.copyWith(bookmarks: updated));
      }
    } else {
      final res = await annotationRepository!.addBookmark(
        bookId: s.book.id,
        chapterId: currentChapter.id,
        chapterIndex: s.currentChapterIndex,
        chapterTitle: currentChapter.title,
        location: location ?? s.progress?.currentLocation ?? '0',
        label: label,
      );
      if (res.isSuccess) {
        final updated = [...s.bookmarks, res.dataOrNull!];
        emit(s.copyWith(bookmarks: updated));
      }
    }
  }

  Future<HighlightEntity?> addHighlight({
    required int startOffset,
    required int endOffset,
    required String selectedText,
    String? note,
    int colorValue = HighlightEntity.defaultHighlightColor,
  }) async {
    final s = state;
    if (s is! ReaderLoaded || annotationRepository == null) return null;

    final currentChapter = s.currentChapter;
    final res = await annotationRepository!.createHighlight(
      bookId: s.book.id,
      chapterId: currentChapter.id,
      chapterIndex: s.currentChapterIndex,
      chapterTitle: currentChapter.title,
      startOffset: startOffset,
      endOffset: endOffset,
      selectedText: selectedText,
      note: note,
      colorValue: colorValue,
    );

    if (res.isSuccess) {
      final entity = res.dataOrNull!;
      final updated = [...s.highlights, entity];
      emit(s.copyWith(highlights: updated));
      return entity;
    }
    return null;
  }

  Future<void> deleteHighlight(String highlightId) async {
    final s = state;
    if (s is! ReaderLoaded || annotationRepository == null) return;

    final res = await annotationRepository!.deleteHighlight(highlightId);
    if (res.isSuccess) {
      final updated =
          s.highlights.where((h) => h.id != highlightId).toList(growable: false);
      emit(s.copyWith(highlights: updated));
    }
  }

  Future<void> updateHighlightNote({
    required String highlightId,
    required String? note,
  }) async {
    final s = state;
    if (s is! ReaderLoaded || annotationRepository == null) return;

    final res = await annotationRepository!.updateHighlightNote(
      highlightId: highlightId,
      note: note,
    );
    if (res.isSuccess) {
      final updatedEntity = res.dataOrNull!;
      final updated = s.highlights
          .map((h) => h.id == highlightId ? updatedEntity : h)
          .toList(growable: false);
      emit(s.copyWith(highlights: updated));
    }
  }

  Future<void> updateHighlightColor({
    required String highlightId,
    required int colorValue,
  }) async {
    final s = state;
    if (s is! ReaderLoaded || annotationRepository == null) return;

    final res = await annotationRepository!.updateHighlightColor(
      highlightId: highlightId,
      colorValue: colorValue,
    );
    if (res.isSuccess) {
      final updatedEntity = res.dataOrNull!;
      final updated = s.highlights
          .map((h) => h.id == highlightId ? updatedEntity : h)
          .toList(growable: false);
      emit(s.copyWith(highlights: updated));
    }
  }

  Future<void> reloadAnnotations() async {
    final s = state;
    if (s is! ReaderLoaded || annotationRepository == null) return;
    final bRes = await annotationRepository!.getBookmarksForBook(s.book.id);
    final hRes = await annotationRepository!.getHighlightsForChapter(
      bookId: s.book.id,
      chapterId: s.currentChapter.id,
    );
    emit(s.copyWith(
      bookmarks: bRes.dataOrNull ?? s.bookmarks,
      highlights: hRes.dataOrNull ?? s.highlights,
    ));
  }

  /// Immediately persists any pending reading progress write to local database without waiting for debounce.
  Future<void> flushProgress() async {
    await _flushProgressSave();
  }

  Future<void> _flushProgressSave() async {
    _debounceTimer?.cancel();
    _debounceTimer = null;
    if (_pendingProgress != null) {
      final toSave = _pendingProgress!;
      _pendingProgress = null;
      await bookRepository.saveReadingProgress(toSave);
    }
  }

  @override
  Future<void> close() async {
    await _flushProgressSave();
    return super.close();
  }
}
