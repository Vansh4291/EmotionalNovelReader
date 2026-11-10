import 'package:emotional_novel_reader/core/errors/failures.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Failure hierarchy tests', () {
    test('DatabaseFailure preserves message and cause', () {
      final cause = Exception('Disk error');
      final failure = DatabaseFailure('Query failed', cause);

      expect(failure.message, 'Query failed');
      expect(failure.cause, cause);
      expect(failure.toString(), contains('DatabaseFailure: Query failed (Cause: Exception: Disk error)'));
    });

    test('StorageFailure correctly formats without cause', () {
      const failure = StorageFailure('File not found');
      expect(failure.toString(), 'StorageFailure: File not found');
    });

    test('SecurityFailure captures path traversal context', () {
      const failure = SecurityFailure('Access denied to /etc');
      expect(failure, isA<Failure>());
      expect(failure.message, contains('Access denied'));
    });
  });

  group('Result<T> functional pattern tests', () {
    test('Success returns data and isSuccess is true', () {
      const result = Result.success('novel_data');

      expect(result.isSuccess, isTrue);
      expect(result.isError, isFalse);
      expect(result.dataOrNull, 'novel_data');
      expect(result.failureOrNull, isNull);
    });

    test('Error returns failure and isError is true', () {
      const failure = NotFoundFailure('Book missing');
      const result = Result<String>.error(failure);

      expect(result.isSuccess, isFalse);
      expect(result.isError, isTrue);
      expect(result.dataOrNull, isNull);
      expect(result.failureOrNull, failure);
    });

    test('fold branches correctly on Success and Error', () {
      const success = Result.success(42);
      final successVal = success.fold(
        onSuccess: (val) => val * 2,
        onError: (_) => 0,
      );
      expect(successVal, 84);

      const error = Result<int>.error(ValidationFailure('Invalid int'));
      final errorVal = error.fold(
        onSuccess: (val) => val * 2,
        onError: (f) => -1,
      );
      expect(errorVal, -1);
    });

    test('map transforms inner value on Success', () {
      const success = Result.success(10);
      final mapped = success.map((v) => 'Count: $v');
      expect(mapped.dataOrNull, 'Count: 10');

      const error = Result<int>.error(ValidationFailure('Failed'));
      final errorMapped = error.map((v) => 'Count: $v');
      expect(errorMapped.isError, isTrue);
    });
  });
}

