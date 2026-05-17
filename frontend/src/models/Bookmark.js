import Realm from 'realm';

export class Bookmark extends Realm.Object {
  static schema = {
    name: 'Bookmark',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      bookId: 'string',
      chapterIndex: 'int',
      sentenceIndex: 'int',
      note: { type: 'string', optional: true },
      createdAt: 'date',
    },
  };
}