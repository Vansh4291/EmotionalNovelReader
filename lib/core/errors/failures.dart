/// Base failure contract for the EmotionalNovelReader domain.
abstract class Failure {
  const Failure(this.message);

  final String message;

  @override
  String toString() => message;
}

