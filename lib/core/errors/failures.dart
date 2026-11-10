/// Centralized Failure hierarchy for EmotionalNovelReader domain and data operations.
sealed class Failure {
  const Failure(this.message, [this.cause, this.stackTrace]);

  final String message;
  final Object? cause;
  final StackTrace? stackTrace;

  @override
  String toString() {
    if (cause != null) {
      return '$runtimeType: $message (Cause: $cause)';
    }
    return '$runtimeType: $message';
  }
}

/// Failures originating from SQLite database queries, transactions, or migrations.
final class DatabaseFailure extends Failure {
  const DatabaseFailure(super.message, [super.cause, super.stackTrace]);
}

/// Failures originating from filesystem operations, Scoped Storage, or SAF access.
final class StorageFailure extends Failure {
  const StorageFailure(super.message, [super.cause, super.stackTrace]);
}

/// Failures originating from document parsing or format decoding.
final class DocumentParsingFailure extends Failure {
  const DocumentParsingFailure(super.message, [super.cause, super.stackTrace]);
}

/// Failure when an entity (book, chapter, bookmark) is not found.
final class NotFoundFailure extends Failure {
  const NotFoundFailure(super.message, [super.cause, super.stackTrace]);
}

/// Validation failure for invalid parameters or inputs.
final class ValidationFailure extends Failure {
  const ValidationFailure(super.message, [super.cause, super.stackTrace]);
}

/// Security violation (e.g. path traversal attempt in archive extraction).
final class SecurityFailure extends Failure {
  const SecurityFailure(super.message, [super.cause, super.stackTrace]);
}

/// Unhandled or unexpected exceptions mapped to a failure.
final class UnexpectedFailure extends Failure {
  const UnexpectedFailure(super.message, [super.cause, super.stackTrace]);
}

/// Generic functional Result type representing either a [Success] or an [Error].
sealed class Result<T> {
  const Result();

  const factory Result.success(T data) = Success<T>;
  const factory Result.error(Failure failure) = Error<T>;

  bool get isSuccess => this is Success<T>;
  bool get isError => this is Error<T>;

  T? get dataOrNull => switch (this) {
        Success<T>(data: final data) => data,
        Error<T>() => null,
      };

  Failure? get failureOrNull => switch (this) {
        Success<T>() => null,
        Error<T>(failure: final failure) => failure,
      };

  R fold<R>({
    required R Function(T data) onSuccess,
    required R Function(Failure failure) onError,
  }) =>
      switch (this) {
        Success<T>(data: final data) => onSuccess(data),
        Error<T>(failure: final failure) => onError(failure),
      };

  Result<R> map<R>(R Function(T data) transform) => switch (this) {
        Success<T>(data: final data) => Result.success(transform(data)),
        Error<T>(failure: final failure) => Result.error(failure),
      };
}

final class Success<T> extends Result<T> {
  const Success(this.data);
  final T data;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Success<T> && runtimeType == other.runtimeType && data == other.data;

  @override
  int get hashCode => data.hashCode;

  @override
  String toString() => 'Success($data)';
}

final class Error<T> extends Result<T> {
  const Error(this.failure);
  final Failure failure;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Error<T> &&
          runtimeType == other.runtimeType &&
          failure == other.failure;

  @override
  int get hashCode => failure.hashCode;

  @override
  String toString() => 'Error($failure)';
}
