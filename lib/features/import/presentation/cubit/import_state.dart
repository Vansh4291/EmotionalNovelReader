import '../../../library/domain/entities/book_entity.dart';

sealed class ImportState {
  const ImportState();
}

final class ImportInitial extends ImportState {
  const ImportInitial();
}

final class ImportSelecting extends ImportState {
  const ImportSelecting();
}

final class ImportInProgress extends ImportState {
  const ImportInProgress({
    required this.fileName,
    required this.progress,
    required this.status,
  });

  final String fileName;
  final double progress;
  final String status;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ImportInProgress &&
          fileName == other.fileName &&
          progress == other.progress &&
          status == other.status;

  @override
  int get hashCode => Object.hash(fileName, progress, status);
}

final class ImportSuccess extends ImportState {
  const ImportSuccess(this.book);
  final BookEntity book;

  @override
  bool operator ==(Object other) =>
      identical(this, other) || other is ImportSuccess && book.id == other.book.id;

  @override
  int get hashCode => book.id.hashCode;
}

final class ImportError extends ImportState {
  const ImportError(this.message);
  final String message;

  @override
  bool operator ==(Object other) =>
      identical(this, other) || other is ImportError && message == other.message;

  @override
  int get hashCode => message.hashCode;
}

