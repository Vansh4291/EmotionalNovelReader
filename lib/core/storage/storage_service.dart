import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import '../errors/failures.dart';

/// Storage service managing sandboxed book files, cache lifecycle, and path safety.
abstract interface class StorageService {
  Future<Directory> getAppLibraryDirectory();
  Future<Directory> getBookDirectory(String bookId);
  Future<Directory> getTempDirectory();
  Future<void> cleanupTempDirectory();
  Future<String> saveBookFile({
    required String bookId,
    required String originalFileName,
    required List<int> bytes,
  });
  Future<String> copyBookFile({
    required String bookId,
    required String originalFileName,
    required File sourceFile,
  });
  Future<String> saveCoverImage({
    required String bookId,
    required List<int> bytes,
  });
  Future<String> calculateSha256(File file);
  Future<void> deleteBookDirectory(String bookId);
  void assertSafeRelativePath(String basePath, String relativePath);
}

class DefaultStorageService implements StorageService {
  const DefaultStorageService();

  @override
  Future<Directory> getAppLibraryDirectory() async {
    try {
      final appDocDir = await getApplicationDocumentsDirectory();
      final libraryDir = Directory(p.join(appDocDir.path, 'library', 'books'));
      if (!await libraryDir.exists()) {
        await libraryDir.create(recursive: true);
      }
      return libraryDir;
    } catch (e, stack) {
      throw StorageFailure('Failed to access application library directory', e, stack);
    }
  }

  @override
  Future<Directory> getBookDirectory(String bookId) async {
    try {
      final libraryDir = await getAppLibraryDirectory();
      final bookDir = Directory(p.join(libraryDir.path, bookId));
      if (!await bookDir.exists()) {
        await bookDir.create(recursive: true);
      }
      return bookDir;
    } catch (e, stack) {
      throw StorageFailure('Failed to create book storage directory for $bookId', e, stack);
    }
  }

  @override
  Future<Directory> getTempDirectory() async {
    try {
      final cacheDir = await getTemporaryDirectory();
      final tempStagingDir = Directory(p.join(cacheDir.path, 'enr_staging'));
      if (!await tempStagingDir.exists()) {
        await tempStagingDir.create(recursive: true);
      }
      return tempStagingDir;
    } catch (e, stack) {
      throw StorageFailure('Failed to access temporary staging directory', e, stack);
    }
  }

  @override
  Future<void> cleanupTempDirectory() async {
    try {
      final cacheDir = await getTemporaryDirectory();
      final tempStagingDir = Directory(p.join(cacheDir.path, 'enr_staging'));
      if (await tempStagingDir.exists()) {
        await tempStagingDir.delete(recursive: true);
      }
    } catch (e, stack) {
      throw StorageFailure('Failed to clean up temporary staging directory', e, stack);
    }
  }

  @override
  Future<String> saveBookFile({
    required String bookId,
    required String originalFileName,
    required List<int> bytes,
  }) async {
    try {
      final bookDir = await getBookDirectory(bookId);
      final extension = p.extension(originalFileName);
      final destinationFile = File(p.join(bookDir.path, 'original$extension'));
      await destinationFile.writeAsBytes(bytes, flush: true);
      return destinationFile.path;
    } catch (e, stack) {
      throw StorageFailure('Failed to save imported book file for $bookId', e, stack);
    }
  }

  @override
  Future<String> copyBookFile({
    required String bookId,
    required String originalFileName,
    required File sourceFile,
  }) async {
    try {
      final bookDir = await getBookDirectory(bookId);
      final extension = p.extension(originalFileName);
      final destinationFile = File(p.join(bookDir.path, 'original$extension'));
      final reader = sourceFile.openRead();
      final writer = destinationFile.openWrite();
      await reader.pipe(writer);
      return destinationFile.path;
    } catch (e, stack) {
      throw StorageFailure('Failed to stream copy imported book file for $bookId', e, stack);
    }
  }

  @override
  Future<String> saveCoverImage({
    required String bookId,
    required List<int> bytes,
  }) async {
    try {
      final bookDir = await getBookDirectory(bookId);
      final coverFile = File(p.join(bookDir.path, 'cover.jpg'));
      await coverFile.writeAsBytes(bytes, flush: true);
      return coverFile.path;
    } catch (e, stack) {
      throw StorageFailure('Failed to save cover image for $bookId', e, stack);
    }
  }

  @override
  Future<String> calculateSha256(File file) async {
    try {
      if (!await file.exists()) {
        throw StorageFailure('File does not exist: ${file.path}');
      }
      final stream = file.openRead();
      final digest = await sha256.bind(stream).first;
      return digest.toString();
    } catch (e, stack) {
      if (e is Failure) rethrow;
      throw StorageFailure('Failed to calculate SHA-256 for ${file.path}', e, stack);
    }
  }

  @override
  Future<void> deleteBookDirectory(String bookId) async {
    try {
      final libraryDir = await getAppLibraryDirectory();
      final bookDir = Directory(p.join(libraryDir.path, bookId));
      if (await bookDir.exists()) {
        await bookDir.delete(recursive: true);
      }
    } catch (e, stack) {
      throw StorageFailure('Failed to delete book directory for $bookId', e, stack);
    }
  }

  @override
  void assertSafeRelativePath(String basePath, String relativePath) {
    final canonicalBase = p.canonicalize(basePath);
    final targetPath = p.canonicalize(p.join(basePath, relativePath));
    final separator = p.separator;
    final baseWithSep = canonicalBase.endsWith(separator) ? canonicalBase : '$canonicalBase$separator';
    if (!targetPath.startsWith(baseWithSep) && targetPath != canonicalBase) {
      throw SecurityFailure(
        'Path traversal detected: "$relativePath" attempts to escape base directory "$basePath"',
      );
    }
  }
}

