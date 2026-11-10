/// Domain entity representing a book in the EmotionalNovelReader library.
class BookEntity {
  const BookEntity({
    required this.id,
    required this.title,
    this.author,
    required this.originalFileName,
    required this.filePath,
    required this.format,
    required this.sha256,
    required this.fileSizeBytes,
    this.coverImagePath,
    required this.createdAt,
    this.lastReadAt,
  });

  final String id;
  final String title;
  final String? author;
  final String originalFileName;
  final String filePath;
  final String format;
  final String sha256;
  final int fileSizeBytes;
  final String? coverImagePath;
  final DateTime createdAt;
  final DateTime? lastReadAt;

  BookEntity copyWith({
    String? id,
    String? title,
    String? author,
    String? originalFileName,
    String? filePath,
    String? format,
    String? sha256,
    int? fileSizeBytes,
    String? coverImagePath,
    DateTime? createdAt,
    DateTime? lastReadAt,
  }) {
    return BookEntity(
      id: id ?? this.id,
      title: title ?? this.title,
      author: author ?? this.author,
      originalFileName: originalFileName ?? this.originalFileName,
      filePath: filePath ?? this.filePath,
      format: format ?? this.format,
      sha256: sha256 ?? this.sha256,
      fileSizeBytes: fileSizeBytes ?? this.fileSizeBytes,
      coverImagePath: coverImagePath ?? this.coverImagePath,
      createdAt: createdAt ?? this.createdAt,
      lastReadAt: lastReadAt ?? this.lastReadAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is BookEntity &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          title == other.title &&
          author == other.author &&
          originalFileName == other.originalFileName &&
          filePath == other.filePath &&
          format == other.format &&
          sha256 == other.sha256 &&
          fileSizeBytes == other.fileSizeBytes &&
          coverImagePath == other.coverImagePath &&
          createdAt == other.createdAt &&
          lastReadAt == other.lastReadAt;

  @override
  int get hashCode =>
      id.hashCode ^
      title.hashCode ^
      author.hashCode ^
      originalFileName.hashCode ^
      filePath.hashCode ^
      format.hashCode ^
      sha256.hashCode ^
      fileSizeBytes.hashCode ^
      coverImagePath.hashCode ^
      createdAt.hashCode ^
      lastReadAt.hashCode;

  @override
  String toString() => 'BookEntity(id: $id, title: "$title", format: $format)';
}

