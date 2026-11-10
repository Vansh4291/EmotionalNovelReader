import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/logging/app_logger.dart';
import '../../../library/domain/entities/reading_progress_entity.dart';
import '../../../library/domain/repositories/book_repository.dart';
import '../../domain/entities/reader_preferences.dart';
import 'reader_state.dart';

/// Cubit managing book reading state, chapter navigation, preferences, and debounced progress persistence.
class ReaderCubit extends Cubit<ReaderState> {
  ReaderCubit({
    required this.bookRepository,
    required this.logger,
  }) : super(const ReaderInitial());

  final BookRepository bookRepository;
  final AppLogger logger;

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
    if (initialChapterIndex != null && initialChapterIndex >= 0 && initialChapterIndex < chapters.length) {
      targetChapterIndex = initialChapterIndex;
    } else if (progress?.currentChapterId != null) {
      final foundIndex = chapters.indexWhere((c) => c.id == progress!.currentChapterId);
      if (foundIndex != -1) {
        targetChapterIndex = foundIndex;
      }
    }

    emit(
      ReaderLoaded(
        book: book,
        chapters: chapters,
        currentChapterIndex: targetChapterIndex,
        progress: progress,
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

  Future<void> goToChapter(int index) async {
    final s = state;
    if (s is! ReaderLoaded) return;
    if (index < 0 || index >= s.chapters.length) return;

    // Flush any pending progress save immediately
    await _flushProgressSave();

    final targetChapter = s.chapters[index];
    final progressPercentage = (index + 1) / s.chapters.length;

    final updatedProgress = ReadingProgressEntity(
      bookId: s.book.id,
      currentLocation: '0',
      currentChapterId: targetChapter.id,
      progressPercentage: progressPercentage,
      totalSecondsRead: s.progress?.totalSecondsRead ?? 0,
      updatedAt: DateTime.now().toUtc(),
    );

    emit(
      s.copyWith(
        currentChapterIndex: index,
        progress: updatedProgress,
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
