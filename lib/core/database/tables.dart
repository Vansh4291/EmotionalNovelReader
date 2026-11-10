import 'package:drift/drift.dart';

/// Books table storing library metadata and sandboxed file references.
class Books extends Table {
  TextColumn get id => text()();
  TextColumn get title => text()();
  TextColumn get author => text().nullable()();
  TextColumn get originalFileName => text()();
  TextColumn get filePath => text()();
  TextColumn get format => text()(); // epub, pdf, txt
  TextColumn get sha256 => text()();
  IntColumn get fileSizeBytes => integer()();
  TextColumn get coverImagePath => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get lastReadAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

/// Chapters table with cascading foreign key to parent book.
class Chapters extends Table {
  TextColumn get id => text()();
  TextColumn get bookId =>
      text().customConstraint('NOT NULL REFERENCES books(id) ON DELETE CASCADE')();
  IntColumn get chapterIndex => integer()();
  TextColumn get title => text()();
  TextColumn get content => text().withDefault(const Constant(''))();
  TextColumn get href => text().nullable()();
  IntColumn get wordCount => integer().withDefault(const Constant(0))();
  IntColumn get characterCount => integer().withDefault(const Constant(0))();

  @override
  Set<Column> get primaryKey => {id};
}

/// Bookmarks table referencing book and chapter.
class Bookmarks extends Table {
  TextColumn get id => text()();
  TextColumn get bookId =>
      text().customConstraint('NOT NULL REFERENCES books(id) ON DELETE CASCADE')();
  TextColumn get chapterId => text()
      .nullable()
      .customConstraint('REFERENCES chapters(id) ON DELETE CASCADE')();
  TextColumn get location => text()(); // CFI, page index, or character offset
  TextColumn get label => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

/// Highlights and personal annotations table.
class Highlights extends Table {
  TextColumn get id => text()();
  TextColumn get bookId =>
      text().customConstraint('NOT NULL REFERENCES books(id) ON DELETE CASCADE')();
  TextColumn get chapterId => text()
      .nullable()
      .customConstraint('REFERENCES chapters(id) ON DELETE CASCADE')();
  TextColumn get startLocation => text()();
  TextColumn get endLocation => text()();
  TextColumn get selectedText => text()();
  TextColumn get note => text().nullable()();
  IntColumn get colorValue => integer().withDefault(const Constant(0xFFFFEB3B))();
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

/// Reading progress table maintaining 1:1 relation with books.
class ReadingProgressTable extends Table {
  TextColumn get bookId =>
      text().customConstraint('NOT NULL REFERENCES books(id) ON DELETE CASCADE')();
  TextColumn get currentLocation => text()();
  TextColumn get currentChapterId => text()
      .nullable()
      .customConstraint('REFERENCES chapters(id) ON DELETE SET NULL')();
  RealColumn get progressPercentage => real().withDefault(const Constant(0.0))();
  IntColumn get totalSecondsRead => integer().withDefault(const Constant(0))();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {bookId};
}

