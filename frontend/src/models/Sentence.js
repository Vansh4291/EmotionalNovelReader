import Realm from 'realm';

export class Sentence extends Realm.Object {
  static schema = {
    name: 'Sentence',
    embedded: true,
    properties: {
      index: 'int',
      text: 'string',
      emotion: 'string',
      confidence: 'float',
      startChar: 'int',
      endChar: 'int',
    },
  };
}