import Realm from 'realm';
import { Book, Chapter, Sentence, UserProgress, Bookmark, UserSettings } from '../models';

const realmConfig = {
  schema: [Book, Chapter, Sentence, UserProgress, Bookmark, UserSettings],
  schemaVersion: 1,
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
        realm.create('Chapter', {
          _id: `${newBook._id}_chapter_${index}`,
          bookId: newBook._id,
          chapterIndex: index,
          title: chapter.title || `Chapter ${index + 1}`,
          rawText: chapter.text || '',
          isAnalyzed: true,
          wordCount: chapter.wordCount || 0,
        });
      });
    }
  });

  return newBook;
};

export const getAllBooks = async () => {
  const realm = await getRealm();
  const books = realm.objects('Book').sorted('addedAt', true);
  return books.map(book => ({
    _id: book._id,
    title: book.title,
    author: book.author,
    coverImagePath: book.coverImagePath,
    filePath: book.filePath,
    fileType: book.fileType,
    totalChapters: book.totalChapters,
    addedAt: book.addedAt.toISOString(),
    isEmotionAnalyzed: book.isEmotionAnalyzed,
  }));
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
    sentences: [],
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

export const updateProgress = async (bookId, chapterIndex, sentenceIndex) => {
  const realm = await getRealm();
  
  realm.write(() => {
    let progress = realm.objects('UserProgress').filtered('bookId == $0', bookId)[0];
    
    if (progress) {
      progress.currentChapterIndex = chapterIndex;
      progress.currentSentenceIndex = sentenceIndex;
      progress.lastUpdatedAt = new Date();
    }
  });
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
};