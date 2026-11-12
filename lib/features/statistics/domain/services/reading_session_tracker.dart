import 'package:uuid/uuid.dart';

import '../entities/reading_session_entity.dart';
import '../repositories/statistics_repository.dart';

/// Tracks active reading sessions with pause/resume and lifecycle handling.
class ReadingSessionTracker {
  ReadingSessionTracker({
    required this.statisticsRepository,
    this.minimumSessionDurationSeconds = 3,
  });

  final StatisticsRepository statisticsRepository;
  final int minimumSessionDurationSeconds;

  String? _currentSessionId;
  String? _bookId;
  String? _chapterId;
  DateTime? _sessionStartTime;
  DateTime? _lastResumeTime;
  int _accumulatedSeconds = 0;
  int _charactersRead = 0;
  int _chaptersCompleted = 0;
  bool _isPaused = false;

  bool get isTracking => _currentSessionId != null;
  bool get isPaused => _isPaused;

  int get currentElapsedSeconds =>
      _accumulatedSeconds +
      (!_isPaused && _lastResumeTime != null
          ? DateTime.now().difference(_lastResumeTime!).inSeconds
          : 0);

  void startSession({required String bookId, String? chapterId}) {
    if (_currentSessionId != null) {
      endSession();
    }

    final now = DateTime.now();
    _currentSessionId = const Uuid().v4();
    _bookId = bookId;
    _chapterId = chapterId;
    _sessionStartTime = now;
    _lastResumeTime = now;
    _accumulatedSeconds = 0;
    _charactersRead = 0;
    _chaptersCompleted = 0;
    _isPaused = false;
  }

  void updateChapter(String chapterId, {bool chapterCompleted = false}) {
    if (_currentSessionId == null) return;
    _chapterId = chapterId;
    if (chapterCompleted) {
      _chaptersCompleted++;
    }
  }

  void addCharactersRead(int count) {
    if (_currentSessionId == null) return;
    _charactersRead += count;
  }

  void pauseSession() {
    if (_currentSessionId == null || _isPaused) return;
    if (_lastResumeTime != null) {
      _accumulatedSeconds += DateTime.now()
          .difference(_lastResumeTime!)
          .inSeconds;
      _lastResumeTime = null;
    }
    _isPaused = true;
  }

  void resumeSession() {
    if (_currentSessionId == null || !_isPaused) return;
    _lastResumeTime = DateTime.now();
    _isPaused = false;
  }

  Future<ReadingSessionEntity?> endSession() async {
    if (_currentSessionId == null ||
        _sessionStartTime == null ||
        _bookId == null) {
      return null;
    }

    if (!_isPaused && _lastResumeTime != null) {
      _accumulatedSeconds += DateTime.now()
          .difference(_lastResumeTime!)
          .inSeconds;
      _lastResumeTime = null;
    }

    final now = DateTime.now();
    final durationSeconds = _accumulatedSeconds;
    final sessionId = _currentSessionId!;
    final bookId = _bookId!;
    final chapterId = _chapterId;
    final startTime = _sessionStartTime!;
    final charactersRead = _charactersRead;
    final chaptersCompleted = _chaptersCompleted;

    // Reset state
    _currentSessionId = null;
    _bookId = null;
    _chapterId = null;
    _sessionStartTime = null;
    _lastResumeTime = null;
    _accumulatedSeconds = 0;
    _charactersRead = 0;
    _chaptersCompleted = 0;
    _isPaused = false;

    // Discard momentary clicks/bounces
    if (durationSeconds < minimumSessionDurationSeconds) {
      return null;
    }

    final session = ReadingSessionEntity(
      id: sessionId,
      bookId: bookId,
      chapterId: chapterId,
      startTime: startTime,
      endTime: now,
      durationSeconds: durationSeconds,
      charactersRead: charactersRead,
      chaptersCompleted: chaptersCompleted,
    );

    await statisticsRepository.recordSession(session);
    return session;
  }
}
