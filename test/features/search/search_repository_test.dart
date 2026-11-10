import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:emotional_novel_reader/core/database/app_database.dart';
import 'package:emotional_novel_reader/features/search/data/repositories/search_repository_impl.dart';
import 'package:emotional_novel_reader/features/search/domain/repositories/search_repository.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late AppDatabase db;
  late SearchRepository repository;

  setUp(() async {
    db = AppDatabase(NativeDatabase.memory());
    repository = SearchRepositoryImpl(database: db);

    final now = DateTime.now().toUtc();

    // Setup multilingual test books and chapters
    // Book 1: English classic
    await db.insertBook(
      BooksCompanion.insert(
        id: 'book-en',
        title: 'Pride and Prejudice',
        author: const Value('Jane Austen'),
        originalFileName: 'pride.epub',
        filePath: '/test/pride.epub',
        format: 'epub',
        sha256: 'sha-en-1',
        fileSizeBytes: 1000,
        createdAt: now,
      ),
    );
    await db.insertChapters([
      ChaptersCompanion.insert(
        id: 'ch-en-1',
        bookId: 'book-en',
        chapterIndex: 0,
        title: 'Chapter 1',
        content: const Value('It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.'),
        wordCount: const Value(23),
        characterCount: const Value(118),
      ),
      ChaptersCompanion.insert(
        id: 'ch-en-2',
        bookId: 'book-en',
        chapterIndex: 1,
        title: 'Chapter 2',
        content: const Value('Mr. Bennet was among the earliest of those who waited on Mr. Bingley.'),
        wordCount: const Value(13),
        characterCount: const Value(69),
      ),
    ]);

    // Book 2: Hindi literature
    await db.insertBook(
      BooksCompanion.insert(
        id: 'book-hi',
        title: 'गोदान',
        author: const Value('मुंशी प्रेमचंद'),
        originalFileName: 'godan.epub',
        filePath: '/test/godan.epub',
        format: 'epub',
        sha256: 'sha-hi-1',
        fileSizeBytes: 2000,
        createdAt: now,
      ),
    );
    await db.insertChapters([
      ChaptersCompanion.insert(
        id: 'ch-hi-1',
        bookId: 'book-hi',
        chapterIndex: 0,
        title: 'पहला अध्याय',
        content: const Value('होरी बैलों को सानी-पानी देकर अपनी लाठी संभालता हुआ बाहर निकला। उसका मन चिंता से भरा था।'),
        wordCount: const Value(17),
        characterCount: const Value(87),
      ),
    ]);

    // Book 3: Gujarati literature
    await db.insertBook(
      BooksCompanion.insert(
        id: 'book-gu',
        title: 'સરસ્વતીચંદ્ર',
        author: const Value('ગોવર્ધનરામ ત્રિપાઠી'),
        originalFileName: 'saraswati.epub',
        filePath: '/test/saraswati.epub',
        format: 'epub',
        sha256: 'sha-gu-1',
        fileSizeBytes: 2000,
        createdAt: now,
      ),
    );
    await db.insertChapters([
      ChaptersCompanion.insert(
        id: 'ch-gu-1',
        bookId: 'book-gu',
        chapterIndex: 0,
        title: 'પ્રથમ પ્રકરણ',
        content: const Value('સુવર્ણપુરની સુંદર સવારે સરસ્વતીચંદ્ર નવી દિશામાં પ્રયાણ કરે છે.'),
        wordCount: const Value(9),
        characterCount: const Value(60),
      ),
    ]);

    // Book 4: Japanese literature
    await db.insertBook(
      BooksCompanion.insert(
        id: 'book-ja',
        title: '吾輩は猫である',
        author: const Value('夏目漱石'),
        originalFileName: 'neko.epub',
        filePath: '/test/neko.epub',
        format: 'epub',
        sha256: 'sha-ja-1',
        fileSizeBytes: 3000,
        createdAt: now,
      ),
    );
    await db.insertChapters([
      ChaptersCompanion.insert(
        id: 'ch-ja-1',
        bookId: 'book-ja',
        chapterIndex: 0,
        title: '一',
        content: const Value('吾輩は猫である。名前はまだ無い。どこで生れたかとんと見当がつかぬ。'),
        wordCount: const Value(10),
        characterCount: const Value(35),
      ),
    ]);

    // Book 5: Chinese literature
    await db.insertBook(
      BooksCompanion.insert(
        id: 'book-zh',
        title: '红楼梦',
        author: const Value('曹雪芹'),
        originalFileName: 'honglou.epub',
        filePath: '/test/honglou.epub',
        format: 'epub',
        sha256: 'sha-zh-1',
        fileSizeBytes: 3000,
        createdAt: now,
      ),
    );
    await db.insertChapters([
      ChaptersCompanion.insert(
        id: 'ch-zh-1',
        bookId: 'book-zh',
        chapterIndex: 0,
        title: '第一回',
        content: const Value('满纸荒唐言，一把辛酸泪！都云作者痴，谁解其中味？贾宝玉与林黛玉初次相见。'),
        wordCount: const Value(15),
        characterCount: const Value(38),
      ),
    ]);

    // Populate FTS index for all books
    await db.rebuildFtsIndex();
  });

  tearDown(() async {
    await db.close();
  });

  group('SearchRepository Multilingual and FTS tests', () {
    test('English full-text search matches and returns snippet with mark tags', () async {
      final result = await repository.searchContent('universally acknowledged');
      expect(result.isSuccess, isTrue);
      final matches = result.dataOrNull!;
      expect(matches, isNotEmpty);
      expect(matches.first.bookTitle, 'Pride and Prejudice');
      expect(matches.first.chapterTitle, 'Chapter 1');
      expect(matches.first.snippet, contains('<mark>'));
    });

    test('Hindi (Devanagari) full-text search matches accurately', () async {
      final result = await repository.searchContent('चिंता');
      expect(result.isSuccess, isTrue);
      final matches = result.dataOrNull!;
      expect(matches, isNotEmpty);
      expect(matches.first.bookId, 'book-hi');
      expect(matches.first.chapterTitle, 'पहला अध्याय');
      expect(matches.first.snippet, contains('चिंता'));
    });

    test('Gujarati script full-text search matches accurately', () async {
      final result = await repository.searchContent('સુવર્ણપુર');
      expect(result.isSuccess, isTrue);
      final matches = result.dataOrNull!;
      expect(matches, isNotEmpty);
      expect(matches.first.bookId, 'book-gu');
      expect(matches.first.chapterTitle, 'પ્રથમ પ્રકરણ');
      expect(matches.first.snippet, contains('સુવર્ણપુર'));
    });

    test('Japanese continuous text 3+ chars matches via trigram tokenizer', () async {
      final result = await repository.searchContent('見当がつかぬ');
      expect(result.isSuccess, isTrue);
      final matches = result.dataOrNull!;
      expect(matches, isNotEmpty);
      expect(matches.first.bookId, 'book-ja');
      expect(matches.first.chapterTitle, '一');
    });

    test('Japanese short query (<3 chars) matches via fallback substring search', () async {
      // "猫" is a 1-character ideogram, below trigram 3-char minimum
      final result = await repository.searchContent('猫');
      expect(result.isSuccess, isTrue);
      final matches = result.dataOrNull!;
      expect(matches, isNotEmpty);
      expect(matches.first.bookId, 'book-ja');
      expect(matches.first.snippet, contains('<mark>猫</mark>'));
    });

    test('Chinese continuous text matches via trigram and substring fallback', () async {
      // 3+ character search
      final longResult = await repository.searchContent('一把辛酸泪');
      expect(longResult.isSuccess, isTrue);
      expect(longResult.dataOrNull!, isNotEmpty);
      expect(longResult.dataOrNull!.first.bookId, 'book-zh');

      // 2-character short search
      final shortResult = await repository.searchContent('林黛玉');
      expect(shortResult.isSuccess, isTrue);
      expect(shortResult.dataOrNull!, isNotEmpty);
      expect(shortResult.dataOrNull!.first.bookId, 'book-zh');
      expect(shortResult.dataOrNull!.first.snippet, contains('<mark>林黛玉</mark>'));
    });

    test('Book metadata search matches title and author across languages', () async {
      // English author
      final enAuthor = await repository.searchBooks('Jane Austen');
      expect(enAuthor.isSuccess, isTrue);
      expect(enAuthor.dataOrNull!.first.title, 'Pride and Prejudice');

      // Hindi author
      final hiAuthor = await repository.searchBooks('प्रेमचंद');
      expect(hiAuthor.isSuccess, isTrue);
      expect(hiAuthor.dataOrNull!.first.id, 'book-hi');

      // Japanese title
      final jaTitle = await repository.searchBooks('吾輩は猫');
      expect(jaTitle.isSuccess, isTrue);
      expect(jaTitle.dataOrNull!.first.id, 'book-ja');

      // Chinese author
      final zhAuthor = await repository.searchBooks('曹雪芹');
      expect(zhAuthor.isSuccess, isTrue);
      expect(zhAuthor.dataOrNull!.first.id, 'book-zh');
    });

    test('Scoped book content search restricts results to the target book', () async {
      // Search 'Chapter' scoped to book-en
      final scoped = await repository.searchContent('Chapter', bookId: 'book-en');
      expect(scoped.isSuccess, isTrue);
      for (final match in scoped.dataOrNull!) {
        expect(match.bookId, 'book-en');
      }

      // Search scoped to book-hi for an English word yields empty list
      final emptyScoped = await repository.searchContent('Bingley', bookId: 'book-hi');
      expect(emptyScoped.isSuccess, isTrue);
      expect(emptyScoped.dataOrNull!, isEmpty);
    });

    test('Rebuild index repopulates FTS index cleanly', () async {
      final rebuildResult = await repository.reindexAllContent();
      expect(rebuildResult.isSuccess, isTrue);

      final search = await repository.searchContent('universally');
      expect(search.isSuccess, isTrue);
      expect(search.dataOrNull!, isNotEmpty);
    });
  });
}
