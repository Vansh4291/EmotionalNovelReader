import Realm from 'realm';
import { Sentence } from './Sentence';

export class Chapter extends Realm.Object {
  static schema = {
    name: 'Chapter',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      bookId: 'objectId',
      chapterIndex: 'int',
      title: { type: 'string', optional: true },
      rawText: 'string',
      sentences: { type: 'list', objectType: 'Sentence', default: [] },
      isAnalyzed: { type: 'bool', default: false },
      wordCount: { type: 'int', default: 0 },
    },
  };
}