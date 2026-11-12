import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../errors/failures.dart';

/// Contract for securely storing sensitive user credentials (API keys, backup passwords).
abstract interface class SecureStorageService {
  Future<void> write({required String key, required String value});
  Future<String?> read({required String key});
  Future<void> delete({required String key});
  Future<bool> containsKey({required String key});
  Future<void> deleteAll();
}

/// Implementation using Android EncryptedSharedPreferences backed by hardware KeyStore.
class DefaultSecureStorageService implements SecureStorageService {
  DefaultSecureStorageService({FlutterSecureStorage? storage})
    : _storage =
          storage ??
          const FlutterSecureStorage(
            aOptions: AndroidOptions(
              encryptedSharedPreferences: true,
              resetOnError: true,
            ),
          );

  final FlutterSecureStorage _storage;

  @override
  Future<void> write({required String key, required String value}) async {
    try {
      await _storage.write(key: key, value: value);
    } catch (e, stack) {
      throw SecurityFailure('Failed to securely write key "$key"', e, stack);
    }
  }

  @override
  Future<String?> read({required String key}) async {
    try {
      return await _storage.read(key: key);
    } catch (e, stack) {
      throw SecurityFailure('Failed to read secure key "$key"', e, stack);
    }
  }

  @override
  Future<void> delete({required String key}) async {
    try {
      await _storage.delete(key: key);
    } catch (e, stack) {
      throw SecurityFailure('Failed to delete secure key "$key"', e, stack);
    }
  }

  @override
  Future<bool> containsKey({required String key}) async {
    try {
      return await _storage.containsKey(key: key);
    } catch (e, stack) {
      throw SecurityFailure(
        'Failed to check existence of secure key "$key"',
        e,
        stack,
      );
    }
  }

  @override
  Future<void> deleteAll() async {
    try {
      await _storage.deleteAll();
    } catch (e, stack) {
      throw SecurityFailure('Failed to clear secure storage', e, stack);
    }
  }
}
