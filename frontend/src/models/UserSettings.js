import Realm from 'realm';

export class UserSettings extends Realm.Object {
  static schema = {
    name: 'UserSettings',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      defaultVoiceEngine: { type: 'string', default: 'android' },
      defaultSpeed: { type: 'float', default: 1.0 },
      defaultPitch: { type: 'float', default: 1.0 },
      defaultVolume: { type: 'float', default: 1.0 },
      emotionEffectsEnabled: { type: 'bool', default: true },
      highlightSyncEnabled: { type: 'bool', default: true },
      sleepTimerMinutes: { type: 'int', default: 0 },
      theme: { type: 'string', default: 'dark' },
      readerFontSize: { type: 'int', default: 18 },
      readerLineHeight: { type: 'float', default: 1.6 },
    },
  };
}