import 'dart:io';
import 'package:path/path.dart' as p;
import 'package:uuid/uuid.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/logging/app_logger.dart';
import '../../../../core/storage/storage_service.dart';
import '../../../library/domain/entities/book_entity.dart';
import '../../../library/domain/entities/chapter_entity.dart';
import '../../../library/domain/entities/reading_progress_entity.dart';
import '../../../library/domain/repositories/book_repository.dart';
import '../entities/detected_format.dart';
import '../extractors/extractor_factory.dart';
import 'format_detector.dart';

/// Service orchestrating document validation, sandboxing, extraction, and database persistence.
class ImportService {
  ImportService({
    required this.storageService,
    required this.bookRepository,
    required this.formatDetector,
    required this.extractorFactory,
    required this.logger,
  });

  final StorageService storageService;
  final BookRepository bookRepository;
  final FormatDetector formatDetector;
  final ExtractorFactory extractorFactory;
  final AppLogger logger;
  final _uuid = const Uuid();

  /// Imports a document file into the application.
  Future<Result<BookEntity>> importDocument(
    File sourceFile, {
    void Function(double progress, String status)? onProgress,
  }) async {
    String? createdBookId;

    try {
      // 1. File existence and readability check
      onProgress?.call(0.05, 'Validating file...');
      if (!await sourceFile.exists()) {
        return const Result.error(ValidationFailure('Selected file does not exist.'));
      }

      final fileSizeBytes = await sourceFile.length();
      if (fileSizeBytes == 0) {
        return const Result.error(ValidationFailure('File is empty (0 bytes).'));
      }

      // 2. Format detection
      onProgress?.call(0.15, 'Sniffing format signature...');
      final detection = await formatDetector.detect(sourceFile);
      if (!detection.isSupported || detection.format == DocumentFormat.unsupported) {
        return Result.error(
          ValidationFailure(
            'Format "${detection.format.displayName}" is not supported: ${detection.description}',
          ),
        );
      }

      // 3. Compute SHA-256 and duplicate check
      onProgress?.call(0.25, 'Calculating checksum...');
      final sha256 = await storageService.calculateSha256(sourceFile);
      final isDuplicateResult = await bookRepository.isDuplicateBook(sha256);

      if (isDuplicateResult.isSuccess && isDuplicateResult.dataOrNull == true) {
        return const Result.error(
          ValidationFailure('This novel has already been imported into your library.'),
        );
      }

      // 4. Generate ID and stream-copy into app sandbox
      final bookId = _uuid.v4();
      createdBookId = bookId;
      final originalFileName = p.basename(sourceFile.path);

      onProgress?.call(0.35, 'Copying to sandboxed storage...');
      final destinationFilePath = await storageService.copyBookFile(
        bookId: bookId,
        originalFileName: originalFileName,
        sourceFile: sourceFile,
      );

      // 5. Extract metadata and chapters
      onProgress?.call(0.45, 'Extracting chapters and metadata...');
      final extractor = extractorFactory.getExtractor(detection.format);
      final extractionResult = await extractor.extract(
        File(destinationFilePath),
        onProgress: (p, status) {
          final mappedProgress = 0.45 + (p * 0.40);
          onProgress?.call(mappedProgress, status);
        },
      );

      if (extractionResult.isError) {
        // Extraction failed: clean up copied sandboxed directory immediately
        await storageService.deleteBookDirectory(bookId);
        createdBookId = null;
        return Result.error(extractionResult.failureOrNull!);
      }

      final extractedData = extractionResult.dataOrNull!;
      if (extractedData.chapters.isEmpty) {
        await storageService.deleteBookDirectory(bookId);
        createdBookId = null;
        return const Result.error(
          DocumentParsingFailure('Document contains no extractable chapters.'),
        );
      }

      // 6. Save cover image if present
      String? coverImagePath;
      if (extractedData.coverImageBytes != null && extractedData.coverImageBytes!.isNotEmpty) {
        try {
          coverImagePath = await storageService.saveCoverImage(
            bookId: bookId,
            bytes: extractedData.coverImageBytes!,
          );
        } catch (e) {
          logger.warning('Failed to persist cover image for book $bookId: $e');
        }
      }

      // 7. Persist BookEntity
      onProgress?.call(0.90, 'Indexing database records...');
      final now = DateTime.now().toUtc();
      final bookEntity = BookEntity(
        id: bookId,
        title: extractedData.title.isNotEmpty ? extractedData.title : p.basenameWithoutExtension(originalFileName),
        author: extractedData.author,
        originalFileName: originalFileName,
        filePath: destinationFilePath,
        format: detection.format.name,
        sha256: sha256,
        fileSizeBytes: fileSizeBytes,
        coverImagePath: coverImagePath,
        createdAt: now,
      );

      final saveBookResult = await bookRepository.saveBook(bookEntity);
      if (saveBookResult.isError) {
        await storageService.deleteBookDirectory(bookId);
        createdBookId = null;
        return Result.error(saveBookResult.failureOrNull!);
      }

      // 8. Persist Chapters
      final chapters = extractedData.chapters.map((ch) {
        return ChapterEntity(
          id: '$bookId-ch-${ch.index}',
          bookId: bookId,
          chapterIndex: ch.index,
          title: ch.title,
          content: ch.content,
          href: ch.href,
          wordCount: ch.wordCount,
          characterCount: ch.characterCount,
        );
      }).toList();

      final saveChaptersResult = await bookRepository.saveChapters(chapters);
      if (saveChaptersResult.isError) {
        await bookRepository.deleteBook(bookId);
        return Result.error(saveChaptersResult.failureOrNull!);
      }

      // 9. Initialize Reading Progress at start of first chapter
      final initialProgress = ReadingProgressEntity(
        bookId: bookId,
        currentLocation: '0',
        currentChapterId: chapters.first.id,
        progressPercentage: 0.0,
        totalSecondsRead: 0,
        updatedAt: now,
      );
      await bookRepository.saveReadingProgress(initialProgress);

      onProgress?.call(1.0, 'Import completed successfully!');
      logger.info('Successfully imported "${bookEntity.title}" ($bookId) with ${chapters.length} chapters.');
      return Result.success(bookEntity);
    } catch (e, stack) {
      if (createdBookId != null) {
        try {
          await storageService.deleteBookDirectory(createdBookId);
          await bookRepository.deleteBook(createdBookId);
        } catch (_) {}
      }
      logger.error('Import failed unexpectedly: ${e.toString()}', e, stack);
      return Result.error(
        UnexpectedFailure('Import failed unexpectedly: ${e.toString()}', e, stack),
      );
    }
  }
}

