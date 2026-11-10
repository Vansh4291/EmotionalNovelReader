import 'package:emotional_novel_reader/core/errors/failures.dart';
import 'package:emotional_novel_reader/features/annotations/domain/entities/bookmark_entity.dart';
import 'package:emotional_novel_reader/features/annotations/domain/entities/chapter_note_entity.dart';
import 'package:emotional_novel_reader/features/annotations/domain/entities/highlight_entity.dart';
import 'package:emotional_novel_reader/features/annotations/domain/repositories/annotation_repository.dart';
import 'package:emotional_novel_reader/features/annotations/presentation/cubit/annotation_cubit.dart';
import 'package:emotional_novel_reader/features/annotations/presentation/cubit/annotation_state.dart';
import 'package:flutter_test/flutter_test.dart';

class FakeAnnotationRepository implements AnnotationRepository {
  List<BookmarkEntity> bookmarks = [];
  List<HighlightEntity> highlights = [];
  List<ChapterNoteEntity> chapterNotes = [];
  bool failBookmarks = false;
  bool failHighlights = false;
  bool failChapterNotes = false;

  @override
  Future<Result<BookmarkEntity>> addBookmark({
    required String bookId,
    String? chapterId,
    int? chapterIndex,
    String? chapterTitle,
    required String location,
    String? label,
  }) async {
    final b = BookmarkEntity(
      id: 'bm-${DateTime.now().millisecondsSinceEpoch}',
      bookId: bookId,
      chapterId: chapterId,
      chapterIndex: chapterIndex,
      chapterTitle: chapterTitle,
      location: location,
      label: label,
      createdAt: DateTime.now(),
    );
    bookmarks.add(b);
    return Result.success(b);
  }

  @override
  Future<Result<void>> deleteBookmark(String bookmarkId) async {
    bookmarks.removeWhere((b) => b.id == bookmarkId);
    return const Result.success(null);
  }

  @override
  Future<Result<void>> deleteBookmarkForChapter({
    required String bookId,
    required String chapterId,
  }) async {
    bookmarks.removeWhere((b) => b.bookId == bookId && b.chapterId == chapterId);
    return const Result.success(null);
  }

  @override
  Future<Result<void>> deleteHighlight(String highlightId) async {
    highlights.removeWhere((h) => h.id == highlightId);
    return const Result.success(null);
  }

  @override
  Future<Result<List<BookmarkEntity>>> getBookmarksForBook(String bookId) async {
    if (failBookmarks) {
      return const Result.error(DatabaseFailure('Bookmark load failed'));
    }
    return Result.success(bookmarks.where((b) => b.bookId == bookId).toList());
  }

  @override
  Future<Result<List<HighlightEntity>>> getHighlightsForBook(String bookId) async {
    if (failHighlights) {
      return const Result.error(DatabaseFailure('Highlight load failed'));
    }
    return Result.success(highlights.where((h) => h.bookId == bookId).toList());
  }

  @override
  Future<Result<List<HighlightEntity>>> getHighlightsForChapter({
    required String bookId,
    required String chapterId,
  }) async {
    return Result.success(
      highlights.where((h) => h.bookId == bookId && h.chapterId == chapterId).toList(),
    );
  }

  @override
  Future<Result<bool>> isChapterBookmarked({
    required String bookId,
    required String chapterId,
  }) async {
    return Result.success(
      bookmarks.any((b) => b.bookId == bookId && b.chapterId == chapterId),
    );
  }

  @override
  Future<Result<HighlightEntity>> createHighlight({
    required String bookId,
    required String chapterId,
    int? chapterIndex,
    String? chapterTitle,
    required int startOffset,
    required int endOffset,
    required String selectedText,
    String? note,
    int colorValue = HighlightEntity.defaultHighlightColor,
  }) async {
    final h = HighlightEntity(
      id: 'hl-${DateTime.now().millisecondsSinceEpoch}',
      bookId: bookId,
      chapterId: chapterId,
      chapterIndex: chapterIndex,
      chapterTitle: chapterTitle,
      startOffset: startOffset,
      endOffset: endOffset,
      selectedText: selectedText,
      note: note,
      colorValue: colorValue,
      createdAt: DateTime.now(),
    );
    highlights.add(h);
    return Result.success(h);
  }

  @override
  Future<Result<HighlightEntity>> updateHighlightColor({
    required String highlightId,
    required int colorValue,
  }) async {
    final idx = highlights.indexWhere((h) => h.id == highlightId);
    final updated = highlights[idx].copyWith(colorValue: colorValue);
    highlights[idx] = updated;
    return Result.success(updated);
  }

  @override
  Future<Result<HighlightEntity>> updateHighlightNote({
    required String highlightId,
    required String? note,
  }) async {
    final idx = highlights.indexWhere((h) => h.id == highlightId);
    final updated = highlights[idx].copyWith(note: note);
    highlights[idx] = updated;
    return Result.success(updated);
  }

  @override
  Stream<List<BookmarkEntity>> watchBookmarksForBook(String bookId) {
    return Stream.value(bookmarks.where((b) => b.bookId == bookId).toList());
  }

  @override
  Stream<List<HighlightEntity>> watchHighlightsForBook(String bookId) {
    return Stream.value(highlights.where((h) => h.bookId == bookId).toList());
  }

  @override
  Stream<List<HighlightEntity>> watchHighlightsForChapter({
    required String bookId,
    required String chapterId,
  }) {
    return Stream.value(
      highlights.where((h) => h.bookId == bookId && h.chapterId == chapterId).toList(),
    );
  }

  @override
  Future<Result<void>> deleteBookmarkAtLocation({
    required String bookId,
    String? chapterId,
    required String location,
  }) async {
    bookmarks.removeWhere((b) =>
        b.bookId == bookId &&
        (chapterId == null || b.chapterId == chapterId) &&
        b.location == location);
    return const Result.success(null);
  }

  @override
  Future<Result<bool>> isLocationBookmarked({
    required String bookId,
    String? chapterId,
    required String location,
  }) async {
    return Result.success(
      bookmarks.any((b) =>
          b.bookId == bookId &&
          (chapterId == null || b.chapterId == chapterId) &&
          b.location == location),
    );
  }

  @override
  Future<Result<ChapterNoteEntity>> createChapterNote({
    required String bookId,
    required String chapterId,
    int? chapterIndex,
    String? chapterTitle,
    required String content,
  }) async {
    final now = DateTime.now();
    final cn = ChapterNoteEntity(
      id: 'cn-${now.millisecondsSinceEpoch}',
      bookId: bookId,
      chapterId: chapterId,
      chapterIndex: chapterIndex,
      chapterTitle: chapterTitle,
      content: content,
      createdAt: now,
      updatedAt: now,
    );
    chapterNotes.add(cn);
    return Result.success(cn);
  }

  @override
  Future<Result<ChapterNoteEntity>> updateChapterNote({
    required String id,
    required String content,
  }) async {
    final idx = chapterNotes.indexWhere((cn) => cn.id == id);
    if (idx == -1) {
      return const Result.error(NotFoundFailure('Chapter note not found'));
    }
    final updated = chapterNotes[idx].copyWith(
      content: content,
      updatedAt: DateTime.now(),
    );
    chapterNotes[idx] = updated;
    return Result.success(updated);
  }

  @override
  Future<Result<void>> deleteChapterNote(String id) async {
    chapterNotes.removeWhere((cn) => cn.id == id);
    return const Result.success(null);
  }

  @override
  Future<Result<List<ChapterNoteEntity>>> getChapterNotesForBook(String bookId) async {
    if (failChapterNotes) {
      return const Result.error(DatabaseFailure('Chapter notes load failed'));
    }
    return Result.success(chapterNotes.where((cn) => cn.bookId == bookId).toList());
  }

  @override
  Future<Result<List<ChapterNoteEntity>>> getChapterNotesForChapter({
    required String bookId,
    required String chapterId,
  }) async {
    return Result.success(
      chapterNotes.where((cn) => cn.bookId == bookId && cn.chapterId == chapterId).toList(),
    );
  }

  @override
  Stream<List<ChapterNoteEntity>> watchChapterNotesForBook(String bookId) {
    return Stream.value(chapterNotes.where((cn) => cn.bookId == bookId).toList());
  }
}

void main() {
  late FakeAnnotationRepository repository;
  late AnnotationCubit cubit;

  const testBookId = 'book-cubit-test';

  setUp(() {
    repository = FakeAnnotationRepository();
    cubit = AnnotationCubit(repository: repository);
  });

  tearDown(() {
    cubit.close();
  });

  group('AnnotationCubit Tests', () {
    test('Initial state is AnnotationInitial', () {
      expect(cubit.state, isA<AnnotationInitial>());
    });

    test('loadAnnotations emits [AnnotationLoading, AnnotationLoaded] on success', () async {
      repository.bookmarks = [
        BookmarkEntity(
          id: 'b1',
          bookId: testBookId,
          chapterId: 'ch1',
          chapterIndex: 0,
          chapterTitle: 'Chapter 1',
          location: '0',
          createdAt: DateTime.now(),
        ),
      ];
      repository.highlights = [
        HighlightEntity(
          id: 'h1',
          bookId: testBookId,
          chapterId: 'ch1',
          chapterIndex: 0,
          chapterTitle: 'Chapter 1',
          startOffset: 0,
          endOffset: 10,
          selectedText: 'Test text',
          note: 'A deep note',
          createdAt: DateTime.now(),
        ),
      ];

      await cubit.loadAnnotations(testBookId);

      expect(cubit.state, isA<AnnotationLoaded>());
      final state = cubit.state as AnnotationLoaded;
      expect(state.bookId, testBookId);
      expect(state.allBookmarks.length, 1);
      expect(state.allHighlights.length, 1);
      expect(state.filter, AnnotationFilter.all);
      expect(state.displayedBookmarks.length, 1);
      expect(state.displayedHighlights.length, 1);
    });

    test('loadAnnotations emits [AnnotationLoading, AnnotationError] on failure', () async {
      repository.failBookmarks = true;
      await cubit.loadAnnotations(testBookId);
      expect(cubit.state, isA<AnnotationError>());
    });

    test('Filtering updates displayedBookmarks and displayedHighlights correctly', () async {
      repository.bookmarks = [
        BookmarkEntity(
          id: 'b1',
          bookId: testBookId,
          chapterId: 'ch1',
          location: '0',
          createdAt: DateTime.now(),
        ),
      ];
      repository.highlights = [
        HighlightEntity(
          id: 'h1',
          bookId: testBookId,
          chapterId: 'ch1',
          startOffset: 0,
          endOffset: 5,
          selectedText: 'Text 1',
          createdAt: DateTime.now(),
        ),
        HighlightEntity(
          id: 'h2',
          bookId: testBookId,
          chapterId: 'ch1',
          startOffset: 10,
          endOffset: 20,
          selectedText: 'Text 2',
          note: 'Remark on text 2',
          createdAt: DateTime.now(),
        ),
      ];

      await cubit.loadAnnotations(testBookId);
      var state = cubit.state as AnnotationLoaded;
      expect(state.displayedBookmarks.length, 1);
      expect(state.displayedHighlights.length, 2);

      // Bookmarks only
      cubit.setFilter(AnnotationFilter.bookmarks);
      state = cubit.state as AnnotationLoaded;
      expect(state.displayedBookmarks.length, 1);
      expect(state.displayedHighlights.isEmpty, isTrue);

      // Highlights only
      cubit.setFilter(AnnotationFilter.highlights);
      state = cubit.state as AnnotationLoaded;
      expect(state.displayedBookmarks.isEmpty, isTrue);
      expect(state.displayedHighlights.length, 2);

      // Notes only
      cubit.setFilter(AnnotationFilter.notes);
      state = cubit.state as AnnotationLoaded;
      expect(state.displayedBookmarks.isEmpty, isTrue);
      expect(state.displayedHighlights.length, 1);
      expect(state.displayedHighlights.first.id, 'h2');
    });

    test('Search query matches across chapters, labels, text, and notes', () async {
      repository.bookmarks = [
        BookmarkEntity(
          id: 'b1',
          bookId: testBookId,
          chapterTitle: 'Awakening of Heroes',
          location: '0',
          createdAt: DateTime.now(),
        ),
        BookmarkEntity(
          id: 'b2',
          bookId: testBookId,
          chapterTitle: 'Silent Forest',
          label: 'Secret Passage',
          location: '50',
          createdAt: DateTime.now(),
        ),
      ];
      repository.highlights = [
        HighlightEntity(
          id: 'h1',
          bookId: testBookId,
          startOffset: 0,
          endOffset: 10,
          selectedText: 'The crystal glowed brightly',
          createdAt: DateTime.now(),
        ),
        HighlightEntity(
          id: 'h2',
          bookId: testBookId,
          startOffset: 15,
          endOffset: 25,
          selectedText: 'Under the ancient oak',
          note: 'Remember this secret passage',
          createdAt: DateTime.now(),
        ),
      ];

      await cubit.loadAnnotations(testBookId);

      // Search 'crystal'
      cubit.setSearchQuery('crystal');
      var state = cubit.state as AnnotationLoaded;
      expect(state.displayedBookmarks.isEmpty, isTrue);
      expect(state.displayedHighlights.length, 1);
      expect(state.displayedHighlights.first.id, 'h1');

      // Search 'secret' (matches b2 label and h2 note)
      cubit.setSearchQuery('secret');
      state = cubit.state as AnnotationLoaded;
      expect(state.displayedBookmarks.length, 1);
      expect(state.displayedBookmarks.first.id, 'b2');
      expect(state.displayedHighlights.length, 1);
      expect(state.displayedHighlights.first.id, 'h2');
    });

    test('deleteBookmark, deleteHighlight, updateNote, updateColor update state directly', () async {
      repository.bookmarks = [
        BookmarkEntity(
          id: 'b1',
          bookId: testBookId,
          location: '0',
          createdAt: DateTime.now(),
        ),
      ];
      repository.highlights = [
        HighlightEntity(
          id: 'h1',
          bookId: testBookId,
          startOffset: 0,
          endOffset: 10,
          selectedText: 'Select text',
          createdAt: DateTime.now(),
        ),
      ];

      await cubit.loadAnnotations(testBookId);

      // Update note
      await cubit.updateNote('h1', 'New note content');
      var state = cubit.state as AnnotationLoaded;
      expect(state.allHighlights.first.note, 'New note content');

      // Update color
      await cubit.updateColor('h1', 0xFF90CAF9);
      state = cubit.state as AnnotationLoaded;
      expect(state.allHighlights.first.colorValue, 0xFF90CAF9);

      // Delete bookmark
      await cubit.deleteBookmark('b1');
      state = cubit.state as AnnotationLoaded;
      expect(state.allBookmarks.isEmpty, isTrue);

      // Delete highlight
      await cubit.deleteHighlight('h1');
      state = cubit.state as AnnotationLoaded;
      expect(state.allHighlights.isEmpty, isTrue);
    });
  });
}

