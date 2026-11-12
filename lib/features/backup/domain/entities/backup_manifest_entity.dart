class BackupManifestEntity {
  const BackupManifestEntity({
    required this.backupVersion,
    required this.appVersion,
    required this.createdAt,
    required this.databaseSchemaVersion,
    required this.bookCount,
    required this.chapterCount,
    required this.bookmarkCount,
    required this.highlightCount,
    required this.noteCount,
    required this.sessionCount,
    required this.totalBytes,
    required this.checksumSha256,
    this.isEncrypted = false,
    this.hasBookFiles = true,
    this.warning = 'Unencrypted export: contains private reading text and annotations. Anyone who obtains this file can view its contents.',
  });

  final int backupVersion;
  final String appVersion;
  final DateTime createdAt;
  final int databaseSchemaVersion;
  final int bookCount;
  final int chapterCount;
  final int bookmarkCount;
  final int highlightCount;
  final int noteCount;
  final int sessionCount;
  final int totalBytes;
  final String checksumSha256;
  final bool isEncrypted;
  final bool hasBookFiles;
  final String warning;

  Map<String, dynamic> toJson() => {
    'backupVersion': backupVersion,
    'appVersion': appVersion,
    'createdAt': createdAt.toUtc().toIso8601String(),
    'databaseSchemaVersion': databaseSchemaVersion,
    'bookCount': bookCount,
    'chapterCount': chapterCount,
    'bookmarkCount': bookmarkCount,
    'highlightCount': highlightCount,
    'noteCount': noteCount,
    'sessionCount': sessionCount,
    'totalBytes': totalBytes,
    'checksumSha256': checksumSha256,
    'isEncrypted': isEncrypted,
    'hasBookFiles': hasBookFiles,
    'warning': warning,
  };

  factory BackupManifestEntity.fromJson(Map<String, dynamic> json) {
    return BackupManifestEntity(
      backupVersion: json['backupVersion'] as int? ?? 1,
      appVersion: json['appVersion'] as String? ?? '1.0.0',
      createdAt: DateTime.parse(json['createdAt'] as String),
      databaseSchemaVersion: json['databaseSchemaVersion'] as int? ?? 5,
      bookCount: json['bookCount'] as int? ?? 0,
      chapterCount: json['chapterCount'] as int? ?? 0,
      bookmarkCount: json['bookmarkCount'] as int? ?? 0,
      highlightCount: json['highlightCount'] as int? ?? 0,
      noteCount: json['noteCount'] as int? ?? 0,
      sessionCount: json['sessionCount'] as int? ?? 0,
      totalBytes: json['totalBytes'] as int? ?? 0,
      checksumSha256: json['checksumSha256'] as String? ?? '',
      isEncrypted: json['isEncrypted'] as bool? ?? false,
      hasBookFiles: json['hasBookFiles'] as bool? ?? true,
      warning: json['warning'] as String? ?? '',
    );
  }
}

enum RestoreConflictMode { merge, replace }

class BackupRestoreSummary {
  const BackupRestoreSummary({
    required this.restoredBooksCount,
    required this.restoredChaptersCount,
    required this.restoredBookmarksCount,
    required this.restoredHighlightsCount,
    required this.restoredNotesCount,
    required this.restoredSessionsCount,
  });

  final int restoredBooksCount;
  final int restoredChaptersCount;
  final int restoredBookmarksCount;
  final int restoredHighlightsCount;
  final int restoredNotesCount;
  final int restoredSessionsCount;
}
