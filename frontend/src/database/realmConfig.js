import Realm from 'realm';
import { Book } from '../models/Book';
import { Chapter } from '../models/Chapter';
import { Sentence } from '../models/Sentence';
import { UserProgress } from '../models/UserProgress';
import { Bookmark } from '../models/Bookmark';
import { UserSettings } from '../models/UserSettings';

const realmConfig = {
  schema: [Book, Chapter, Sentence, UserProgress, Bookmark, UserSettings],
  schemaVersion: 1,
};

export const openLocalRealm = () => Realm.open(realmConfig);

export const getRealmConfig = () => realmConfig;