import 'package:drift/drift.dart';

import '../../../../core/database/app_database.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/storage/storage_service.dart';
import '../../domain/entities/book_entity.dart';
import '../../domain/entities/chapter_entity.dart';
import '../../domain/entities/reading_progress_entity.dart';
import '../../domain/repositories/book_repository.dart';

/// Production implementation of [BookRepository] backed by Drift SQLite and [StorageService].
class BookRepositoryImpl implements BookRepository {
  BookRepositoryImpl({required this.database, required this.storageService});

  final AppDatabase database;
  final StorageService storageService;

  BookEntity _mapToEntity(Book book) {
    return BookEntity(
      id: book.id,
      title: book.title,
      author: book.author,
      originalFileName: book.originalFileName,
      filePath: book.filePath,
      format: book.format,
      sha256: book.sha256,
      fileSizeBytes: book.fileSizeBytes,
      coverImagePath: book.coverImagePath,
      createdAt: book.createdAt,
      lastReadAt: book.lastReadAt,
    );
  }

  ChapterEntity _mapChapterToEntity(Chapter chapter) {
    return ChapterEntity(
      id: chapter.id,
      bookId: chapter.bookId,
      chapterIndex: chapter.chapterIndex,
      title: chapter.title,
      content: chapter.content,
      href: chapter.href,
      wordCount: chapter.wordCount,
      characterCount: chapter.characterCount,
    );
  }

  ReadingProgressEntity _mapProgressToEntity(ReadingProgressTableData data) {
    return ReadingProgressEntity(
      bookId: data.bookId,
      currentLocation: data.currentLocation,
      currentChapterId: data.currentChapterId,
      progressPercentage: data.progressPercentage,
      totalSecondsRead: data.totalSecondsRead,
      updatedAt: data.updatedAt,
    );
  }

  BooksCompanion _mapToCompanion(BookEntity entity) {
    return BooksCompanion(
      id: Value(entity.id),
      title: Value(entity.title),
      author: Value(entity.author),
      originalFileName: Value(entity.originalFileName),
      filePath: Value(entity.filePath),
      format: Value(entity.format),
      sha256: Value(entity.sha256),
      fileSizeBytes: Value(entity.fileSizeBytes),
      coverImagePath: Value(entity.coverImagePath),
      createdAt: Value(entity.createdAt),
      lastReadAt: Value(entity.lastReadAt),
    );
  }

  ChaptersCompanion _mapChapterToCompanion(ChapterEntity entity) {
    return ChaptersCompanion(
      id: Value(entity.id),
      bookId: Value(entity.bookId),
      chapterIndex: Value(entity.chapterIndex),
      title: Value(entity.title),
      content: Value(entity.content),
      href: Value(entity.href),
      wordCount: Value(entity.wordCount),
      characterCount: Value(entity.characterCount),
    );
  }

  ReadingProgressTableCompanion _mapProgressToCompanion(
    ReadingProgressEntity entity,
  ) {
    return ReadingProgressTableCompanion(
      bookId: Value(entity.bookId),
      currentLocation: Value(entity.currentLocation),
      currentChapterId: Value(entity.currentChapterId),
      progressPercentage: Value(entity.progressPercentage),
      totalSecondsRead: Value(entity.totalSecondsRead),
      updatedAt: Value(entity.updatedAt),
    );
  }

  @override
  Stream<List<BookEntity>> watchAllBooks() {
    return database.watchAllBooks().map(
      (books) => books.map(_mapToEntity).toList(),
    );
  }

  @override
  Future<Result<List<BookEntity>>> getAllBooks() async {
    try {
      final books = await database.getAllBooks();
      return Result.success(books.map(_mapToEntity).toList());
    } catch (e, stack) {
      return Result.error(
        DatabaseFailure('Failed to query books from database', e, stack),
      );
    }
  }

  @override
  Future<Result<BookEntity>> getBookById(String id) async {
    try {
      final book = await database.getBookById(id);
      if (book == null) {
        return Result.error(NotFoundFailure('Book not found with id "$id"'));
      }
      return Result.success(_mapToEntity(book));
    } catch (e, stack) {
      return Result.error(
        DatabaseFailure('Failed to query book "$id"', e, stack),
      );
    }
  }

  @override
  Future<Result<bool>> isDuplicateBook(String sha256) async {
    try {
      final existing = await database.getBookBySha(sha256);
      return Result.success(existing != null);
    } catch (e, stack) {
      return Result.error(
        DatabaseFailure(
          'Failed to check duplicate book SHA "$sha256"',
          e,
          stack,
        ),
      );
    }
  }

  @override
  Future<Result<void>> saveBook(BookEntity book) async {
    try {
      final companion = _mapToCompanion(book);
      final existing = await database.getBookById(book.id);
      if (existing != null) {
        await database.updateBook(companion);
      } else {
        await database.insertBook(companion);
      }
      return const Result.success(null);
    } catch (e, stack) {
      return Result.error(
        DatabaseFailure('Failed to save book "${book.id}"', e, stack),
      );
    }
  }

  @override
  Future<Result<void>> deleteBook(String id) async {
    try {
      // Delete book record in SQLite (cascading deletes remove chapters/bookmarks/progress)
      final deletedCount = await database.deleteBook(id);
      if (deletedCount == 0) {
        return Result.error(
          NotFoundFailure('Book not found to delete with id "$id"'),
        );
      }

      // Clean up FTS search index entries
      await database.deleteFtsForBook(id);

      // Clean up sandboxed book files
      await storageService.deleteBookDirectory(id);

      return const Result.success(null);
    } catch (e, stack) {
      return Result.error(
        DatabaseFailure('Failed to delete book "$id"', e, stack),
      );
    }
  }

  @override
  Future<Result<void>> saveChapters(List<ChapterEntity> chapters) async {
    try {
      final companions = chapters.map(_mapChapterToCompanion).toList();
      await database.insertChapters(companions);

      if (chapters.isNotEmpty) {
        final bookId = chapters.first.bookId;
        final book = await database.getBookById(bookId);
        final bookTitle = book?.title ?? '';
        await database.indexChaptersForBook(
          bookId: bookId,
          bookTitle: bookTitle,
          chaptersList: companions,
        );
      }

      return const Result.success(null);
    } catch (e, stack) {
      return Result.error(DatabaseFailure('Failed to save chapters', e, stack));
    }
  }

  @override
  Future<Result<List<ChapterEntity>>> getChapters(String bookId) async {
    try {
      final chapters = await database.getChaptersForBook(bookId);
      return Result.success(chapters.map(_mapChapterToEntity).toList());
    } catch (e, stack) {
      return Result.error(
        DatabaseFailure(
          'Failed to query chapters for book "$bookId"',
          e,
          stack,
        ),
      );
    }
  }

  @override
  Future<Result<ChapterEntity>> getChapter(String chapterId) async {
    try {
      final chapter = await database.getChapterById(chapterId);
      if (chapter == null) {
        return Result.error(
          NotFoundFailure('Chapter not found with id "$chapterId"'),
        );
      }
      return Result.success(_mapChapterToEntity(chapter));
    } catch (e, stack) {
      return Result.error(
        DatabaseFailure('Failed to query chapter "$chapterId"', e, stack),
      );
    }
  }

  @override
  Future<Result<int>> getChapterCount(String bookId) async {
    try {
      final count = await database.getChapterCountForBook(bookId);
      return Result.success(count);
    } catch (e, stack) {
      return Result.error(
        DatabaseFailure(
          'Failed to count chapters for book "$bookId"',
          e,
          stack,
        ),
      );
    }
  }

  @override
  Future<Result<ReadingProgressEntity?>> getReadingProgress(
    String bookId,
  ) async {
    try {
      final progress = await database.getReadingProgress(bookId);
      if (progress == null) {
        return const Result.success(null);
      }
      return Result.success(_mapProgressToEntity(progress));
    } catch (e, stack) {
      return Result.error(
        DatabaseFailure(
          'Failed to get reading progress for book "$bookId"',
          e,
          stack,
        ),
      );
    }
  }

  @override
  Future<Result<void>> saveReadingProgress(
    ReadingProgressEntity progress,
  ) async {
    try {
      await database.saveReadingProgress(_mapProgressToCompanion(progress));
      return const Result.success(null);
    } catch (e, stack) {
      return Result.error(
        DatabaseFailure('Failed to save reading progress', e, stack),
      );
    }
  }

  @override
  Stream<ReadingProgressEntity?> watchReadingProgress(String bookId) {
    return database
        .watchReadingProgress(bookId)
        .map((data) => data != null ? _mapProgressToEntity(data) : null);
  }
}
