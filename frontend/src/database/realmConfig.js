import Realm from 'realm';
import { Book, Chapter, Sentence, UserProgress, Bookmark, UserSettings } from '../models';

const realmConfig = {
  schema: [Book, Chapter, Sentence, UserProgress, Bookmark, UserSettings],
  schemaVersion: 1,
};

export const openLocalRealm = () => Realm.open(realmConfig);

export const getRealmConfig = () => realmConfig;