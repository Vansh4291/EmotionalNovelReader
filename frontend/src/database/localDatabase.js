import Realm from 'realm';
import { Book } from '../models/Book';
import { Chapter } from '../models/Chapter';
import { Sentence } from '../models/Sentence';
import { UserProgress } from '../models/UserProgress';
import { Bookmark } from '../models/Bookmark';
import { UserSettings } from '../models/UserSettings';

const realmConfig = {
  schema: [Book, Chapter, Sentence, UserProgress, Bookmark, UserSettings],
  // v2: added readerFontSize/readerLineHeight to UserSettings.
  schemaVersion: 2,
};

let realmInstance = null;

export const getRealm = async () => {
  if (!realmInstance) {
    realmInstance = await Realm.open(realmConfig);
  }
  return realmInstance;
};

export const closeRealm = () => {
  if (realmInstance && !realmInstance.isClosed) {
    realmInstance.close();
    realmInstance = null;
  }
};

export const addBook = async (bookData) => {
  const realm = await getRealm();
  let newBook;
  
  realm.write(() => {
    newBook = realm.create('Book', {
      _id: `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: bookData.title,
      author: bookData.author || 'Unknown Author',
      coverImagePath: bookData.coverImagePath || null,
      filePath: bookData.filePath,
      fileType: bookData.fileType,
      totalChapters: bookData.chapters?.length || 0,
      language: 'en',
      addedAt: new Date(),
      isEmotionAnalyzed: true,
    });

    if (bookData.chapters && bookData.chapters.length > 0) {
      bookData.chapters.forEach((chapter, index) => {
        const createdChapter = realm.create('Chapter', {
          _id: `${newBook._id}_chapter_${index}`,
          bookId: newBook._id,
          chapterIndex: index,
          title: chapter.title || `Chapter ${index + 1}`,
          rawText: chapter.text || '',
          isAnalyzed: true,
          wordCount: chapter.wordCount || 0,
        });

        if (chapter.sentences && chapter.sentences.length > 0) {
          chapter.sentences.forEach((sent) => {
            createdChapter.sentences.push({
              index: sent.index,
              text: sent.text,
              emotion: sent.emotion || 'neutral',
              confidence: sent.confidence || 1.0,
              startChar: sent.startChar || 0,
              endChar: sent.endChar || sent.text.length,
            });
          });
        }
      });
    }
  });

  return newBook;
};

export const getAllBooks = async () => {
  const realm = await getRealm();
  const books = realm.objects("Book").sorted("addedAt", true);
  // Normalize the collection to a plain array: the Realm SDK exposes a live
  // Results (iterable; older versions lack Array.prototype.map), and the
  // validation harness mirrors the same surface. Converting to an array keeps
  // Array methods (map/filter/sort) available regardless of Realm version.
  const items = Array.isArray(books) ? books : Array.from(books);
  const out = [];
  for (const book of items) {
    const progressList = realm.objects('UserProgress').filtered('bookId == $0', book._id);
    const progress = progressList.length > 0 ? progressList[0] : null;
    out.push({
      _id: book._id,
      title: book.title,
      author: book.author,
      coverImagePath: book.coverImagePath,
      filePath: book.filePath,
      fileType: book.fileType,
      totalChapters: book.totalChapters,
      addedAt: book.addedAt.toISOString(),
      isEmotionAnalyzed: book.isEmotionAnalyzed,
      progress: progress ? {
        currentChapterIndex: progress.currentChapterIndex,
        completionPercent: progress.completionPercent,
      } : null,
    });
  }
  return out;
};

export const getBookById = async (bookId) => {
  const realm = await getRealm();
  const book = realm.objectForPrimaryKey('Book', bookId);
  if (!book) return null;

  const chapters = realm.objects('Chapter').filtered('bookId == $0', bookId).sorted('chapterIndex');
  
  return {
    _id: book._id,
    title: book.title,
    author: book.author,
    coverImagePath: book.coverImagePath,
    filePath: book.filePath,
    fileType: book.fileType,
    totalChapters: book.totalChapters,
    addedAt: book.addedAt.toISOString(),
    isEmotionAnalyzed: book.isEmotionAnalyzed,
    chapters: chapters.map(ch => ({
      index: ch.chapterIndex,
      title: ch.title,
      wordCount: ch.wordCount,
      isAnalyzed: ch.isAnalyzed,
    })),
  };
};

export const getChapterWithSentences = async (bookId, chapterIndex) => {
  const realm = await getRealm();
  const chapters = realm.objects('Chapter')
    .filtered('bookId == $0 AND chapterIndex == $1', bookId, chapterIndex);
  
  if (chapters.length === 0) return null;
  
  const chapter = chapters[0];
  return {
    _id: chapter._id,
    bookId: chapter.bookId,
    chapterIndex: chapter.chapterIndex,
    title: chapter.title,
    rawText: chapter.rawText,
    isAnalyzed: chapter.isAnalyzed,
    wordCount: chapter.wordCount,
    sentences: chapter.sentences ? Array.from(chapter.sentences).map(s => ({
      index: s.index,
      text: s.text,
      emotion: s.emotion,
      confidence: s.confidence,
      startChar: s.startChar,
      endChar: s.endChar,
    })) : [],
  };
};

export const deleteBook = async (bookId) => {
  const realm = await getRealm();
  
  realm.write(() => {
    const book = realm.objectForPrimaryKey('Book', bookId);
    if (book) {
      const chapters = realm.objects('Chapter').filtered('bookId == $0', bookId);
      realm.delete(chapters);
      
      const progress = realm.objects('UserProgress').filtered('bookId == $0', bookId);
      realm.delete(progress);
      
      const bookmarks = realm.objects('Bookmark').filtered('bookId == $0', bookId);
      realm.delete(bookmarks);
      
      realm.delete(book);
    }
  });
};

export const getOrCreateProgress = async (bookId) => {
  const realm = await getRealm();
  let progress = realm.objects('UserProgress').filtered('bookId == $0', bookId)[0];
  
  if (!progress) {
    realm.write(() => {
      progress = realm.create('UserProgress', {
        _id: `progress_${bookId}`,
        bookId,
        currentChapterIndex: 0,
        currentSentenceIndex: 0,
        listeningTimeSeconds: 0,
        completionPercent: 0.0,
        lastUpdatedAt: new Date(),
      });
    });
  }
  
  return {
    bookId: progress.bookId,
    currentChapterIndex: progress.currentChapterIndex,
    currentSentenceIndex: progress.currentSentenceIndex,
    listeningTimeSeconds: progress.listeningTimeSeconds,
    completionPercent: progress.completionPercent,
  };
};

export const updateProgress = async (bookId, chapterIndex, sentenceIndex, listeningTimeSeconds = 0) => {
  const realm = await getRealm();
  
  realm.write(() => {
    let progress = realm.objects('UserProgress').filtered('bookId == $0', bookId)[0];
    const book = realm.objectForPrimaryKey('Book', bookId);
    
    if (progress) {
      progress.currentChapterIndex = chapterIndex;
      progress.currentSentenceIndex = sentenceIndex;
      progress.lastUpdatedAt = new Date();
      if (listeningTimeSeconds > 0) {
        progress.listeningTimeSeconds += listeningTimeSeconds;
      }
      if (book && book.totalChapters > 0) {
        progress.completionPercent = Math.min(100.0, Math.max(0.0, ((chapterIndex + 1) / book.totalChapters) * 100));
      }
    }
  });
};

export const getBookmarks = async (bookId) => {
  const realm = await getRealm();
  const bookmarks = realm.objects('Bookmark').filtered('bookId == $0', bookId).sorted('createdAt', true);
  return Array.from(bookmarks).map(b => ({
    _id: b._id,
    bookId: b.bookId,
    chapterIndex: b.chapterIndex,
    sentenceIndex: b.sentenceIndex,
    note: b.note,
    createdAt: b.createdAt.toISOString(),
  }));
};

export const addBookmark = async (bookId, chapterIndex, sentenceIndex, note = '') => {
  const realm = await getRealm();
  let newBookmark;
  realm.write(() => {
    newBookmark = realm.create('Bookmark', {
      _id: `bm_${bookId}_${chapterIndex}_${sentenceIndex}_${Date.now()}`,
      bookId,
      chapterIndex,
      sentenceIndex,
      note,
      createdAt: new Date(),
    });
  });
  return newBookmark ? {
    _id: newBookmark._id,
    bookId: newBookmark.bookId,
    chapterIndex: newBookmark.chapterIndex,
    sentenceIndex: newBookmark.sentenceIndex,
    note: newBookmark.note,
    createdAt: newBookmark.createdAt.toISOString(),
  } : null;
};

export const deleteBookmark = async (bookmarkId) => {
  const realm = await getRealm();
  realm.write(() => {
    const bookmark = realm.objectForPrimaryKey('Bookmark', bookmarkId);
    if (bookmark) {
      realm.delete(bookmark);
    }
  });
};

export const loadSettingsFromRealm = async () => {
  try {
    const realm = await getRealm();
    const existing = realm.objects('UserSettings');
    if (existing.length > 0) {
      const s = existing[0];
      return {
        defaultVoiceEngine: s.defaultVoiceEngine,
        defaultSpeed: s.defaultSpeed,
        defaultPitch: s.defaultPitch,
        defaultVolume: s.defaultVolume,
        emotionEffectsEnabled: s.emotionEffectsEnabled,
        highlightSyncEnabled: s.highlightSyncEnabled,
        sleepTimerMinutes: s.sleepTimerMinutes,
        theme: s.theme,
        readerFontSize: s.readerFontSize,
        readerLineHeight: s.readerLineHeight,
      };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return null;
};

export const saveSettingsToRealm = async (settings) => {
  try {
    const realm = await getRealm();
    realm.write(() => {
      const existing = realm.objects('UserSettings');
      const withDefaults = {
        defaultVoiceEngine: settings.defaultVoiceEngine || 'android',
        defaultSpeed: settings.defaultSpeed ?? 1.0,
        defaultPitch: settings.defaultPitch ?? 1.0,
        defaultVolume: settings.defaultVolume ?? 1.0,
        emotionEffectsEnabled: settings.emotionEffectsEnabled ?? true,
        highlightSyncEnabled: settings.highlightSyncEnabled ?? true,
        sleepTimerMinutes: settings.sleepTimerMinutes ?? 0,
        theme: settings.theme || 'dark',
        readerFontSize: settings.readerFontSize ?? 18,
        readerLineHeight: settings.readerLineHeight ?? 1.6,
      };
      if (existing.length > 0) {
        const s = existing[0];
        Object.assign(s, withDefaults);
      } else {
        realm.create('UserSettings', { _id: 'user_settings', ...withDefaults });
      }
    });
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
};

export default {
  getRealm,
  closeRealm,
  addBook,
  getAllBooks,
  getBookById,
  getChapterWithSentences,
  deleteBook,
  getOrCreateProgress,
  updateProgress,
  getBookmarks,
  addBookmark,
  deleteBookmark,
  loadSettingsFromRealm,
  saveSettingsToRealm,
};