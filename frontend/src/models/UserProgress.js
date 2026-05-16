import Realm from 'realm';

export class UserProgress extends Realm.Object {
  static schema = {
    name: 'UserProgress',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      bookId: 'objectId',
      currentChapterIndex: { type: 'int', default: 0 },
      currentSentenceIndex: { type: 'int', default: 0 },
      currentCharPosition: { type: 'int', default: 0 },
      listeningTimeSeconds: { type: 'int', default: 0 },
      completionPercent: { type: 'float', default: 0.0 },
      lastUpdatedAt: 'date',
    },
  };
}