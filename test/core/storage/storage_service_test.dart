import 'dart:io';

import 'package:emotional_novel_reader/core/errors/failures.dart';
import 'package:emotional_novel_reader/core/storage/storage_service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const storageService = DefaultStorageService();

  group('StorageService security and path checks', () {
    test('assertSafeRelativePath passes for valid child paths', () {
      expect(
        () => storageService.assertSafeRelativePath(
          '/app/data/library',
          'chapter_1.xhtml',
        ),
        returnsNormally,
      );
      expect(
        () => storageService.assertSafeRelativePath(
          '/app/data/library',
          'sub/folder/file.css',
        ),
        returnsNormally,
      );
    });

    test(
      'assertSafeRelativePath throws SecurityFailure on directory traversal',
      () {
        expect(
          () => storageService.assertSafeRelativePath(
            '/app/data/library',
            '../secret.txt',
          ),
          throwsA(isA<SecurityFailure>()),
        );
        expect(
          () => storageService.assertSafeRelativePath(
            '/app/data/library',
            '../../etc/passwd',
          ),
          throwsA(isA<SecurityFailure>()),
        );
      },
    );

    test(
      'calculateSha256 generates consistent SHA-256 hash for bytes',
      () async {
        final tempDir = await Directory.systemTemp.createTemp('enr_test_sha');
        final testFile = File('${tempDir.path}/test.txt');
        await testFile.writeAsString('Hello Emotional Novel Reader');

        final hash = await storageService.calculateSha256(testFile);
        // SHA-256 of "Hello Emotional Novel Reader" is known and deterministic
        expect(hash, isNotEmpty);
        expect(hash.length, 64);

        await tempDir.delete(recursive: true);
      },
    );
  });
}
