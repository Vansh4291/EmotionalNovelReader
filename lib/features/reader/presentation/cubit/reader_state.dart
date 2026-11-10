import 'package:flutter/foundation.dart';
import '../../../annotations/domain/entities/bookmark_entity.dart';
import '../../../annotations/domain/entities/highlight_entity.dart';
import '../../../library/domain/entities/book_entity.dart';
import '../../../library/domain/entities/chapter_entity.dart';
import '../../../library/domain/entities/reading_progress_entity.dart';
import '../../domain/entities/reader_preferences.dart';

sealed class ReaderState {
  const ReaderState();
}

final class ReaderInitial extends ReaderState {
  const ReaderInitial();
}

final class ReaderLoading extends ReaderState {
  const ReaderLoading();
}

final class ReaderLoaded extends ReaderState {
  const ReaderLoaded({
    required this.book,
    required this.chapters,
    required this.currentChapterIndex,
    this.progress,
    this.preferences = const ReaderPreferences(),
    this.isControlsVisible = false,
    this.bookmarks = const [],
    this.highlights = const [],
  });

  final BookEntity book;
  final List<ChapterEntity> chapters;
  final int currentChapterIndex;
  final ReadingProgressEntity? progress;
  final ReaderPreferences preferences;
  final bool isControlsVisible;
  final List<BookmarkEntity> bookmarks;
  final List<HighlightEntity> highlights;

  ChapterEntity get currentChapter => chapters[currentChapterIndex];
  bool get hasNextChapter => currentChapterIndex < chapters.length - 1;
  bool get hasPreviousChapter => currentChapterIndex > 0;
  double get overallProgress =>
      chapters.isEmpty ? 0.0 : (currentChapterIndex + 1) / chapters.length;

  bool get isCurrentChapterBookmarked {
    if (bookmarks.isEmpty) return false;
    final currentChId = currentChapter.id;
    return bookmarks.any(
      (b) => b.chapterId == currentChId || b.chapterIndex == currentChapterIndex,
    );
  }

  ReaderLoaded copyWith({
    BookEntity? book,
    List<ChapterEntity>? chapters,
    int? currentChapterIndex,
    ReadingProgressEntity? progress,
    ReaderPreferences? preferences,
    bool? isControlsVisible,
    List<BookmarkEntity>? bookmarks,
    List<HighlightEntity>? highlights,
  }) {
    return ReaderLoaded(
      book: book ?? this.book,
      chapters: chapters ?? this.chapters,
      currentChapterIndex: currentChapterIndex ?? this.currentChapterIndex,
      progress: progress ?? this.progress,
      preferences: preferences ?? this.preferences,
      isControlsVisible: isControlsVisible ?? this.isControlsVisible,
      bookmarks: bookmarks ?? this.bookmarks,
      highlights: highlights ?? this.highlights,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReaderLoaded &&
          book.id == other.book.id &&
          currentChapterIndex == other.currentChapterIndex &&
          isControlsVisible == other.isControlsVisible &&
          preferences == other.preferences &&
          listEquals(bookmarks, other.bookmarks) &&
          listEquals(highlights, other.highlights);

  @override
  int get hashCode => Object.hash(
        book.id,
        currentChapterIndex,
        isControlsVisible,
        preferences,
        bookmarks.length,
        highlights.length,
      );
}

final class ReaderError extends ReaderState {
  const ReaderError(this.message);
  final String message;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReaderError && message == other.message;

  @override
  int get hashCode => message.hashCode;
}
