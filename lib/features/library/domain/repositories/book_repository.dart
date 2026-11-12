import '../../../../core/errors/failures.dart';
import '../entities/book_entity.dart';
import '../entities/chapter_entity.dart';
import '../entities/reading_progress_entity.dart';

/// Contract for book persistence, chapter indexing, and reading progress operations.
abstract interface class BookRepository {
  Stream<List<BookEntity>> watchAllBooks();
  Future<Result<List<BookEntity>>> getAllBooks();
  Future<Result<BookEntity>> getBookById(String id);
  Future<Result<bool>> isDuplicateBook(String sha256);
  Future<Result<void>> saveBook(BookEntity book);
  Future<Result<void>> deleteBook(String id);

  // Chapter operations
  Future<Result<void>> saveChapters(List<ChapterEntity> chapters);
  Future<Result<List<ChapterEntity>>> getChapters(String bookId);
  Future<Result<ChapterEntity>> getChapter(String chapterId);
  Future<Result<int>> getChapterCount(String bookId);

  // Reading progress operations
  Future<Result<ReadingProgressEntity?>> getReadingProgress(String bookId);
  Future<Result<void>> saveReadingProgress(ReadingProgressEntity progress);
  Stream<ReadingProgressEntity?> watchReadingProgress(String bookId);
}
