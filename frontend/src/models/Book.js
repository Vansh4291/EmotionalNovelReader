import Realm from 'realm';

export class Book extends Realm.Object {
  static schema = {
    name: 'Book',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      title: 'string',
      author: { type: 'string', default: 'Unknown' },
      coverImagePath: { type: 'string', optional: true },
      filePath: 'string',
      fileType: 'string',
      totalChapters: { type: 'int', default: 0 },
      language: { type: 'string', default: 'en' },
      addedAt: 'date',
      lastOpenedAt: { type: 'date', optional: true },
      isEmotionAnalyzed: { type: 'bool', default: false },
    },
  };
}