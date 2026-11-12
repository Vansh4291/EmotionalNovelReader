import 'dart:convert';
import 'dart:io';

import 'package:archive/archive.dart';
import 'package:crypto/crypto.dart';
import 'package:drift/drift.dart';
import 'package:intl/intl.dart';
import 'package:path/path.dart' as p;

import '../../../../core/database/app_database.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/logging/app_logger.dart';
import '../../../../core/storage/storage_service.dart';
import '../../domain/entities/backup_manifest_entity.dart';
import '../../domain/services/backup_service.dart';

class BackupServiceImpl implements BackupService {
  BackupServiceImpl({
    required this.database,
    required this.storageService,
    required this.logger,
  });

  final AppDatabase database;
  final StorageService storageService;
  final AppLogger logger;

  static const int currentBackupVersion = 1;
  static const int maxUncompressedBackupBytes =
      500 * 1024 * 1024; // 500 MB budget
  static const int maxBackupFileEntries = 10000;

  @override
  Future<Result<File>> createBackup({
    Directory? destinationDir,
    bool includeBookFiles = true,
  }) async {
    try {
      final targetDir =
          destinationDir ?? await storageService.getBackupDirectory();
      if (!await targetDir.exists()) {
        await targetDir.create(recursive: true);
      }

      final books = await database.getAllBooks();
      final List<Map<String, dynamic>> chaptersJson = [];
      for (final b in books) {
        final chs = await database.getChaptersForBook(b.id);
        chaptersJson.addAll(
          chs.map(
            (c) => {
              'id': c.id,
              'bookId': c.bookId,
              'chapterIndex': c.chapterIndex,
              'title': c.title,
              'content': c.content,
              'href': c.href,
              'wordCount': c.wordCount,
              'characterCount': c.characterCount,
            },
          ),
        );
      }

      final List<Map<String, dynamic>> bookmarksJson = [];
      final List<Map<String, dynamic>> highlightsJson = [];
      final List<Map<String, dynamic>> notesJson = [];
      final List<Map<String, dynamic>> progressJson = [];
      final List<Map<String, dynamic>> sessionsJson = [];

      for (final b in books) {
        final bms = await database.getBookmarksForBook(b.id);
        bookmarksJson.addAll(
          bms.map(
            (bm) => {
              'id': bm.id,
              'bookId': bm.bookId,
              'chapterId': bm.chapterId,
              'location': bm.location,
              'label': bm.label,
              'createdAt': bm.createdAt.toUtc().toIso8601String(),
            },
          ),
        );

        final hls = await database.getHighlightsForBook(b.id);
        highlightsJson.addAll(
          hls.map(
            (hl) => {
              'id': hl.id,
              'bookId': hl.bookId,
              'chapterId': hl.chapterId,
              'startLocation': hl.startLocation,
              'endLocation': hl.endLocation,
              'selectedText': hl.selectedText,
              'note': hl.note,
              'colorValue': hl.colorValue,
              'createdAt': hl.createdAt.toUtc().toIso8601String(),
            },
          ),
        );

        final cns = await database.getChapterNotesForBook(b.id);
        notesJson.addAll(
          cns.map(
            (cn) => {
              'id': cn.id,
              'bookId': cn.bookId,
              'chapterId': cn.chapterId,
              'content': cn.content,
              'createdAt': cn.createdAt.toUtc().toIso8601String(),
              'updatedAt': cn.updatedAt.toUtc().toIso8601String(),
            },
          ),
        );

        final prog = await database.getReadingProgress(b.id);
        if (prog != null) {
          progressJson.add({
            'bookId': prog.bookId,
            'currentLocation': prog.currentLocation,
            'currentChapterId': prog.currentChapterId,
            'progressPercentage': prog.progressPercentage,
            'totalSecondsRead': prog.totalSecondsRead,
            'updatedAt': prog.updatedAt.toUtc().toIso8601String(),
          });
        }

        final sess = await database.getReadingSessionsForBook(b.id);
        sessionsJson.addAll(
          sess.map(
            (s) => {
              'id': s.id,
              'bookId': s.bookId,
              'chapterId': s.chapterId,
              'startTime': s.startTime.toUtc().toIso8601String(),
              'endTime': s.endTime.toUtc().toIso8601String(),
              'durationSeconds': s.durationSeconds,
              'charactersRead': s.charactersRead,
              'chaptersCompleted': s.chaptersCompleted,
            },
          ),
        );
      }

      final goals = await database.getAllReadingGoals();
      final goalsJson = goals
          .map(
            (g) => {
              'id': g.id,
              'goalType': g.goalType,
              'targetValue': g.targetValue,
              'isEnabled': g.isEnabled,
              'createdAt': g.createdAt.toUtc().toIso8601String(),
              'updatedAt': g.updatedAt.toUtc().toIso8601String(),
            },
          )
          .toList();

      final booksJson = books
          .map(
            (b) => {
              'id': b.id,
              'title': b.title,
              'author': b.author,
              'originalFileName': b.originalFileName,
              'filePath': b.filePath,
              'format': b.format,
              'sha256': b.sha256,
              'fileSizeBytes': b.fileSizeBytes,
              'coverImagePath': b.coverImagePath,
              'createdAt': b.createdAt.toUtc().toIso8601String(),
              'lastReadAt': b.lastReadAt?.toUtc().toIso8601String(),
            },
          )
          .toList();

      final databaseData = {
        'books': booksJson,
        'chapters': chaptersJson,
        'bookmarks': bookmarksJson,
        'highlights': highlightsJson,
        'chapterNotes': notesJson,
        'readingProgress': progressJson,
        'readingSessions': sessionsJson,
        'readingGoals': goalsJson,
      };

      final dataJsonString = jsonEncode(databaseData);
      final dataBytes = utf8.encode(dataJsonString);
      final dataChecksum = sha256.convert(dataBytes).toString();

      final manifest = BackupManifestEntity(
        backupVersion: currentBackupVersion,
        appVersion: '1.0.0',
        createdAt: DateTime.now().toUtc(),
        databaseSchemaVersion: database.schemaVersion,
        bookCount: books.length,
        chapterCount: chaptersJson.length,
        bookmarkCount: bookmarksJson.length,
        highlightCount: highlightsJson.length,
        noteCount: notesJson.length,
        sessionCount: sessionsJson.length,
        totalBytes: dataBytes.length,
        checksumSha256: dataChecksum,
        isEncrypted: false,
        hasBookFiles: includeBookFiles,
      );

      final manifestBytes = utf8.encode(jsonEncode(manifest.toJson()));

      final archive = Archive();
      archive.addFile(
        ArchiveFile('manifest.json', manifestBytes.length, manifestBytes),
      );
      archive.addFile(ArchiveFile('data.json', dataBytes.length, dataBytes));

      if (includeBookFiles) {
        for (final b in books) {
          final bookDir = await storageService.getBookDirectory(b.id);
          if (await bookDir.exists()) {
            final files = bookDir.listSync().whereType<File>();
            for (final f in files) {
              final bytes = await f.readAsBytes();
              final entryName = 'files/${b.id}/${p.basename(f.path)}';
              archive.addFile(ArchiveFile(entryName, bytes.length, bytes));
            }
          }
        }
      }

      final zipData = ZipEncoder().encode(archive);
      if (zipData.isEmpty) {
        return const Result.error(
          StorageFailure('Failed to encode backup zip archive'),
        );
      }

      final timestampStr = DateFormat('yyyyMMdd_HHmmss').format(DateTime.now());
      final backupFileName = 'ENR_Backup_$timestampStr.enrbk';
      final backupFile = File(p.join(targetDir.path, backupFileName));
      await backupFile.writeAsBytes(zipData, flush: true);

      return Result.success(backupFile);
    } catch (e, st) {
      logger.error('Failed to create backup', e, st);
      return Result.error(StorageFailure('Failed to create backup: $e'));
    }
  }

  @override
  Future<Result<BackupManifestEntity>> inspectBackup(File backupFile) async {
    try {
      if (!await backupFile.exists()) {
        return Result.error(
          NotFoundFailure('Backup file not found at ${backupFile.path}'),
        );
      }

      final bytes = await backupFile.readAsBytes();
      final archive = ZipDecoder().decodeBytes(bytes);

      if (archive.length > maxBackupFileEntries) {
        return const Result.error(
          SecurityFailure('Backup archive exceeds entry limit.'),
        );
      }

      int totalUncompressed = 0;
      for (final entry in archive) {
        totalUncompressed += entry.size;
        if (totalUncompressed > maxUncompressedBackupBytes) {
          return const Result.error(
            SecurityFailure('Backup exceeds uncompressed byte budget.'),
          );
        }
      }

      final manifestEntry = archive.findFile('manifest.json');
      if (manifestEntry == null) {
        return const Result.error(
          ValidationFailure('Invalid backup: missing manifest.json'),
        );
      }

      final manifestMap = jsonDecode(
        utf8.decode(manifestEntry.content as List<int>),
      ) as Map<String, dynamic>;
      final manifest = BackupManifestEntity.fromJson(manifestMap);

      if (manifest.backupVersion > currentBackupVersion) {
        return Result.error(
          ValidationFailure(
            'Incompatible backup version: ${manifest.backupVersion} (Current supported: $currentBackupVersion)',
          ),
        );
      }

      final dataEntry = archive.findFile('data.json');
      if (dataEntry == null) {
        return const Result.error(
          ValidationFailure('Invalid backup: missing data.json'),
        );
      }

      final dataBytes = dataEntry.content as List<int>;
      final calculatedSha = sha256.convert(dataBytes).toString();
      if (calculatedSha != manifest.checksumSha256) {
        return const Result.error(
          ValidationFailure(
            'Corrupted backup: checksum mismatch on data payload',
          ),
        );
      }

      return Result.success(manifest);
    } catch (e, st) {
      logger.error('Failed to inspect backup file', e, st);
      return Result.error(ValidationFailure('Could not parse backup file: $e'));
    }
  }

  @override
  Future<Result<BackupRestoreSummary>> restoreBackup(
    File backupFile, {
    RestoreConflictMode conflictMode = RestoreConflictMode.merge,
  }) async {
    try {
      final inspectRes = await inspectBackup(backupFile);
      if (inspectRes.isError) {
        return Result.error(inspectRes.failureOrNull!);
      }

      final bytes = await backupFile.readAsBytes();
      final archive = ZipDecoder().decodeBytes(bytes);

      final dataEntry = archive.findFile('data.json')!;
      final dataMap = jsonDecode(
        utf8.decode(dataEntry.content as List<int>),
      ) as Map<String, dynamic>;

      final rawBooks = (dataMap['books'] as List<dynamic>? ?? [])
          .cast<Map<String, dynamic>>();
      final rawChapters = (dataMap['chapters'] as List<dynamic>? ?? [])
          .cast<Map<String, dynamic>>();
      final rawBookmarks = (dataMap['bookmarks'] as List<dynamic>? ?? [])
          .cast<Map<String, dynamic>>();
      final rawHighlights = (dataMap['highlights'] as List<dynamic>? ?? [])
          .cast<Map<String, dynamic>>();
      final rawNotes = (dataMap['chapterNotes'] as List<dynamic>? ?? [])
          .cast<Map<String, dynamic>>();
      final rawProgress = (dataMap['readingProgress'] as List<dynamic>? ?? [])
          .cast<Map<String, dynamic>>();
      final rawSessions = (dataMap['readingSessions'] as List<dynamic>? ?? [])
          .cast<Map<String, dynamic>>();
      final rawGoals = (dataMap['readingGoals'] as List<dynamic>? ?? [])
          .cast<Map<String, dynamic>>();

      int restoredBooks = 0;
      int restoredChapters = 0;
      int restoredBookmarks = 0;
      int restoredHighlights = 0;
      int restoredNotes = 0;
      int restoredSessions = 0;

      await database.transaction(() async {
        if (conflictMode == RestoreConflictMode.replace) {
          final existing = await database.getAllBooks();
          for (final b in existing) {
            await database.deleteBook(b.id);
            await storageService.deleteBookDirectory(b.id);
          }
          final existingGoals = await database.getAllReadingGoals();
          for (final g in existingGoals) {
            await database.deleteReadingGoal(g.id);
          }
        }

        // Restore books
        for (final b in rawBooks) {
          final bookId = b['id'] as String;
          await database
              .into(database.books)
              .insertOnConflictUpdate(
                BooksCompanion.insert(
                  id: bookId,
                  title: b['title'] as String,
                  author: Value(b['author'] as String?),
                  originalFileName: b['originalFileName'] as String,
                  filePath: b['filePath'] as String,
                  format: b['format'] as String,
                  sha256: b['sha256'] as String,
                  fileSizeBytes: b['fileSizeBytes'] as int,
                  coverImagePath: Value(b['coverImagePath'] as String?),
                  createdAt: DateTime.parse(b['createdAt'] as String),
                  lastReadAt: Value(
                    b['lastReadAt'] != null
                        ? DateTime.parse(b['lastReadAt'] as String)
                        : null,
                  ),
                ),
              );
          restoredBooks++;
        }

        // Restore chapters
        final chaptersBatch = rawChapters
            .map(
              (c) => ChaptersCompanion.insert(
                id: c['id'] as String,
                bookId: c['bookId'] as String,
                chapterIndex: c['chapterIndex'] as int,
                title: c['title'] as String,
                content: Value(c['content'] as String? ?? ''),
                href: Value(c['href'] as String?),
                wordCount: Value(c['wordCount'] as int? ?? 0),
                characterCount: Value(c['characterCount'] as int? ?? 0),
              ),
            )
            .toList();

        if (chaptersBatch.isNotEmpty) {
          await database.insertChapters(chaptersBatch);
          restoredChapters = chaptersBatch.length;
        }

        // Restore bookmarks
        for (final bm in rawBookmarks) {
          await database
              .into(database.bookmarks)
              .insertOnConflictUpdate(
                BookmarksCompanion.insert(
                  id: bm['id'] as String,
                  bookId: bm['bookId'] as String,
                  chapterId: Value(bm['chapterId'] as String?),
                  location: bm['location'] as String,
                  label: Value(bm['label'] as String?),
                  createdAt: DateTime.parse(bm['createdAt'] as String),
                ),
              );
          restoredBookmarks++;
        }

        // Restore highlights
        for (final hl in rawHighlights) {
          await database
              .into(database.highlights)
              .insertOnConflictUpdate(
                HighlightsCompanion.insert(
                  id: hl['id'] as String,
                  bookId: hl['bookId'] as String,
                  chapterId: Value(hl['chapterId'] as String?),
                  startLocation: hl['startLocation'] as String,
                  endLocation: hl['endLocation'] as String,
                  selectedText: hl['selectedText'] as String,
                  note: Value(hl['note'] as String?),
                  colorValue: Value(hl['colorValue'] as int? ?? 0xFFFFEB3B),
                  createdAt: DateTime.parse(hl['createdAt'] as String),
                ),
              );
          restoredHighlights++;
        }

        // Restore chapter notes
        for (final cn in rawNotes) {
          await database
              .into(database.chapterNotes)
              .insertOnConflictUpdate(
                ChapterNotesCompanion.insert(
                  id: cn['id'] as String,
                  bookId: cn['bookId'] as String,
                  chapterId: cn['chapterId'] as String,
                  content: cn['content'] as String,
                  createdAt: DateTime.parse(cn['createdAt'] as String),
                  updatedAt: DateTime.parse(cn['updatedAt'] as String),
                ),
              );
          restoredNotes++;
        }

        // Restore reading progress
        for (final prog in rawProgress) {
          await database.saveReadingProgress(
            ReadingProgressTableCompanion.insert(
              bookId: prog['bookId'] as String,
              currentLocation: prog['currentLocation'] as String,
              currentChapterId: Value(prog['currentChapterId'] as String?),
              progressPercentage: Value(
                prog['progressPercentage'] as double? ?? 0.0,
              ),
              totalSecondsRead: Value(prog['totalSecondsRead'] as int? ?? 0),
              updatedAt: DateTime.parse(prog['updatedAt'] as String),
            ),
          );
        }

        // Restore reading sessions
        for (final sess in rawSessions) {
          await database
              .into(database.readingSessions)
              .insertOnConflictUpdate(
                ReadingSessionsCompanion.insert(
                  id: sess['id'] as String,
                  bookId: sess['bookId'] as String,
                  chapterId: Value(sess['chapterId'] as String?),
                  startTime: DateTime.parse(sess['startTime'] as String),
                  endTime: DateTime.parse(sess['endTime'] as String),
                  durationSeconds: sess['durationSeconds'] as int,
                  charactersRead: Value(sess['charactersRead'] as int? ?? 0),
                  chaptersCompleted: Value(
                    sess['chaptersCompleted'] as int? ?? 0,
                  ),
                ),
              );
          restoredSessions++;
        }

        // Restore reading goals
        for (final g in rawGoals) {
          await database
              .into(database.readingGoals)
              .insertOnConflictUpdate(
                ReadingGoalsCompanion.insert(
                  id: g['id'] as String,
                  goalType: g['goalType'] as String,
                  targetValue: g['targetValue'] as int,
                  isEnabled: Value(g['isEnabled'] as bool? ?? true),
                  createdAt: DateTime.parse(g['createdAt'] as String),
                  updatedAt: DateTime.parse(g['updatedAt'] as String),
                ),
              );
        }

        // Reindex FTS5 for restored chapters
        for (final b in rawBooks) {
          final bookId = b['id'] as String;
          final bookChapters = chaptersBatch
              .where((c) => c.bookId.value == bookId)
              .toList();
          if (bookChapters.isNotEmpty) {
            await database.indexChaptersForBook(
              bookId: bookId,
              bookTitle: b['title'] as String,
              chaptersList: bookChapters,
            );
          }
        }
      });

      // Extract book files
      for (final entry in archive) {
        if (entry.name.startsWith('files/')) {
          final parts = entry.name.split('/');
          if (parts.length >= 3) {
            final bookId = parts[1];
            final fileName = parts.sublist(2).join('/');
            final bookDir = await storageService.getBookDirectory(bookId);
            final targetFile = File(p.join(bookDir.path, fileName));
            await targetFile.parent.create(recursive: true);
            await targetFile.writeAsBytes(
              entry.content as List<int>,
              flush: true,
            );
          }
        }
      }

      return Result.success(
        BackupRestoreSummary(
          restoredBooksCount: restoredBooks,
          restoredChaptersCount: restoredChapters,
          restoredBookmarksCount: restoredBookmarks,
          restoredHighlightsCount: restoredHighlights,
          restoredNotesCount: restoredNotes,
          restoredSessionsCount: restoredSessions,
        ),
      );
    } catch (e, st) {
      logger.error('Failed to restore backup', e, st);
      return Result.error(DatabaseFailure('Failed to restore backup: $e'));
    }
  }
}
