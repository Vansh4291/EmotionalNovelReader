import { useState, useEffect, useCallback, useRef } from 'react';
import { NarrationEngine, NarrationSnapshot } from './narration/NarrationEngine';
import { ChunkedBookStore } from './storage/ChunkedBookStore';
import { EventGovernor } from './events/EventGovernor';
import { getChapterWithSentences, updateProgress, getBookById } from '../database/localDatabase';
import { SentenceData, ChapterMeta, PlaybackState } from './types';

const governor = new EventGovernor();

function createEngine(bookId: string): {
  engine: NarrationEngine;
  store: ChunkedBookStore;
} {
  const store = new ChunkedBookStore(governor, async (bId, chapterIdx) => {
    const data = await getChapterWithSentences(bId, chapterIdx);
    if (!data || !data.sentences) return [];
    return data.sentences.map((s) => ({
      index: s.index,
      text: s.text,
      emotion: s.emotion as SentenceData['emotion'],
      confidence: s.confidence,
      startChar: s.startChar,
      endChar: s.endChar,
    }));
  });

  const engine = new NarrationEngine(
    {
      loadChapter: async (bId, chapterIdx) => {
        return store.loadChapter(chapterIdx);
      },
      saveProgress: async (bId, chapterIdx, sentenceIdx) => {
        await updateProgress(bId, chapterIdx, sentenceIdx);
      },
    },
    governor
  );

  return { engine, store };
}

export interface UseNarrationOptions {
  bookId: string;
  initialChapterIndex?: number;
  initialSentenceIndex?: number;
}

export function useNarration({
  bookId,
  initialChapterIndex = 0,
  initialSentenceIndex = 0,
}: UseNarrationOptions) {
  const engineRef = useRef<NarrationEngine | null>(null);
  const storeRef = useRef<ChunkedBookStore | null>(null);
  const [snapshot, setSnapshot] = useState<NarrationSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;

    const { engine, store } = createEngine(bookId);
    engineRef.current = engine;
    storeRef.current = store;

    const unsubscribe = engine.subscribe((s) => {
      if (!cancelled) {
        setSnapshot(s);
      }
    });

    const init = async () => {
      try {
        const book = await getBookById(bookId);
        if (!book || cancelled) return;

        const chapters: ChapterMeta[] = (book.chapters || []).map(
          (ch: { index: number; title: string; wordCount: number; isAnalyzed: boolean }) => ({
            index: ch.index,
            title: ch.title,
            wordCount: ch.wordCount,
            isAnalyzed: ch.isAnalyzed,
          })
        );

        await store.setBookIndex({
          bookId,
          title: book.title,
          author: book.author,
          fileType: book.fileType,
          totalChapters: book.totalChapters,
          chapters,
        });

        if (!cancelled) {
          await engine.loadBook(bookId, chapters, initialChapterIndex, initialSentenceIndex);
        }
      } catch (e) {
        console.error('[useNarration] Init error:', e);
      }
    };

    init();

    return () => {
      cancelled = true;
      unsubscribe();
      engine.destroy();
      store.destroy();
      engineRef.current = null;
      storeRef.current = null;
    };
  }, [bookId, initialChapterIndex, initialSentenceIndex]);

  const play = useCallback(() => {
    engineRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const stop = useCallback(() => {
    engineRef.current?.stop();
  }, []);

  const nextSentence = useCallback(() => {
    engineRef.current?.nextSentence();
  }, []);

  const previousSentence = useCallback(() => {
    engineRef.current?.previousSentence();
  }, []);

  const nextChapter = useCallback(() => {
    engineRef.current?.nextChapter();
  }, []);

  const previousChapter = useCallback(() => {
    engineRef.current?.previousChapter();
  }, []);

  const seekTo = useCallback(
    (chapterIndex: number, sentenceIndex?: number) => {
      engineRef.current?.seekTo(chapterIndex, sentenceIndex);
    },
    []
  );

  const setSpeed = useCallback((speed: number) => {
    engineRef.current?.setSpeed(speed);
  }, []);

  const setPitch = useCallback((pitch: number) => {
    engineRef.current?.setPitch(pitch);
  }, []);

  return {
    state: snapshot?.state || 'IDLE' as PlaybackState,
    bookId: snapshot?.bookId || bookId,
    chapterIndex: snapshot?.chapterIndex || 0,
    sentenceIndex: snapshot?.sentenceIndex || 0,
    sentences: snapshot?.sentences || [],
    chapters: snapshot?.chapters || [],
    speed: snapshot?.speed || 1.0,
    pitch: snapshot?.pitch || 1.0,
    isPlaying: snapshot?.isPlaying || false,
    currentEmotion: snapshot?.currentEmotion || 'neutral',
    currentText: snapshot?.currentText || null,

    play,
    pause,
    stop,
    nextSentence,
    previousSentence,
    nextChapter,
    previousChapter,
    seekTo,
    setSpeed,
    setPitch,

    engine: engineRef,
    governor,
  };
}
