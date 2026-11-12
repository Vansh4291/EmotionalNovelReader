abstract interface class TtsService {
  Future<bool> initialize();
  Future<void> speak(String text);
  Future<void> pause();
  Future<void> stop();
  Future<void> setSpeechRate(double rate);
  Future<void> setPitch(double pitch);
  Future<void> setVolume(double volume);
  Future<void> setLanguage(String languageCode);
  Future<List<String>> getAvailableLanguages();
  Future<List<String>> getAvailableEngines();
  Future<void> setEngine(String engine);

  void setCompletionHandler(void Function() handler);
  void setErrorHandler(void Function(String message) handler);
  void setProgressHandler(
    void Function(String text, int start, int end, String word) handler,
  );

  void dispose();
}
