import { ChapterMeta, SentenceData } from '../types';
import { EventGovernor } from '../events/EventGovernor';

interface ChapterChunk {
  index: number;
  sentences: SentenceData[];
  loaded: boolean;
  loading: boolean;
  abortController: AbortController | null;
  generation: number;
}

interface BookIndex {
  bookId: string;
  title: string;
  author: string;
  fileType: string;
  totalChapters: number;
  chapters: ChapterMeta[];
}

const LOOKAHEAD_CHAPTERS = 1;

export class ChunkedBookStore {
  private bookIndex: BookIndex | null = null;
  private chunks: Map<number, ChapterChunk> = new Map();
  private governor: EventGovernor;
  private loadChapterFn: (
    bookId: string,
    chapterIndex: number,
    signal?: AbortSignal
  ) => Promise<SentenceData[]>;
  private maxCachedChunks = 5;
  private currentGeneration = 0;

  constructor(
    governor: EventGovernor,
    loadChapterFn: (
      bookId: string,
      chapterIndex: number,
      signal?: AbortSignal
    ) => Promise<SentenceData[]>
  ) {
    this.governor = governor;
    this.loadChapterFn = loadChapterFn;
  }

  async setBookIndex(index: BookIndex): Promise<void> {
    this.cancelAllLoads();
    this.bookIndex = index;
    this.chunks.clear();
    this.currentGeneration += 1;

    for (let i = 0; i < index.totalChapters; i++) {
      this.chunks.set(i, {
        index: i,
        sentences: [],
        loaded: false,
        loading: false,
        abortController: null,
        generation: this.currentGeneration,
      });
    }
  }

  getBookIndex(): BookIndex | null {
    return this.bookIndex;
  }

  cancelAllLoads(): void {
    for (const chunk of this.chunks.values()) {
      if (chunk.abortController) {
        chunk.abortController.abort();
        chunk.abortController = null;
      }
      chunk.loading = false;
    }
  }

  cancelChapterLoad(chapterIndex: number): void {
    const chunk = this.chunks.get(chapterIndex);
    if (chunk?.abortController) {
      chunk.abortController.abort();
      chunk.abortController = null;
      chunk.loading = false;
    }
  }

  async loadChapter(
    chapterIndex: number,
    abortSignal?: AbortSignal
  ): Promise<SentenceData[]> {
    if (!this.bookIndex) {
      throw new Error('No book loaded');
    }

    if (chapterIndex < 0 || chapterIndex >= this.bookIndex.totalChapters) {
      throw new Error(`Invalid chapter index: ${chapterIndex}`);
    }

    const chunk = this.chunks.get(chapterIndex);
    if (chunk?.loaded) {
      return chunk.sentences;
    }

    if (chunk?.loading) {
      return this.waitForChunkLoad(chapterIndex, abortSignal);
    }

    return this.fetchAndCache(chapterIndex, abortSignal);
  }

  private async fetchAndCache(
    chapterIndex: number,
    externalSignal?: AbortSignal
  ): Promise<SentenceData[]> {
    const chunk = this.chunks.get(chapterIndex)!;

    if (chunk.abortController) {
      chunk.abortController.abort();
    }

    const controller = new AbortController();
    chunk.abortController = controller;
    chunk.loading = true;

    const combinedSignal = externalSignal
      ? this.combineAbortSignals(externalSignal, controller.signal)
      : controller.signal;

    this.governor.publish(
      'book:chapter_loading',
      { bookId: this.bookIndex!.bookId, chapterIndex },
      'ChunkedBookStore',
      'normal'
    );

    try {
      const sentences = await this.loadChapterFn(
        this.bookIndex!.bookId,
        chapterIndex,
        combinedSignal
      );

      if (combinedSignal.aborted) {
        throw new Error('Load cancelled');
      }

      chunk.sentences = sentences;
      chunk.loaded = true;
      chunk.loading = false;
      chunk.abortController = null;

      this.governor.publish(
        'book:chapter_loaded',
        {
          bookId: this.bookIndex!.bookId,
          chapterIndex,
          sentenceCount: sentences.length,
        },
        'ChunkedBookStore',
        'normal'
      );

      this.evictIfNeeded();
      this.prefetchLookahead(chapterIndex);

      return sentences;
    } catch (e) {
      chunk.loading = false;
      chunk.abortController = null;

      if (e instanceof Error && e.message === 'Load cancelled') {
        throw e;
      }

      throw e;
    }
  }

  private async waitForChunkLoad(
    chapterIndex: number,
    abortSignal?: AbortSignal
  ): Promise<SentenceData[]> {
    const maxWait = 30000;
    const pollInterval = 50;
    let waited = 0;

    while (waited < maxWait) {
      if (abortSignal?.aborted) {
        throw new Error('Load cancelled');
      }

      const chunk = this.chunks.get(chapterIndex);
      if (chunk?.loaded) {
        return chunk.sentences;
      }
      if (!chunk?.loading) {
        return this.fetchAndCache(chapterIndex, abortSignal);
      }
      await new Promise((r) => setTimeout(r, pollInterval));
      waited += pollInterval;
    }

    throw new Error(`Timeout waiting for chapter ${chapterIndex} to load`);
  }

  private prefetchLookahead(currentChapter: number): void {
    if (!this.bookIndex) return;

    for (let i = 1; i <= LOOKAHEAD_CHAPTERS; i++) {
      const nextIdx = currentChapter + i;
      if (nextIdx >= this.bookIndex.totalChapters) break;

      const chunk = this.chunks.get(nextIdx);
      if (chunk && !chunk.loaded && !chunk.loading) {
        this.fetchAndCache(nextIdx).catch(() => {});
      }
    }
  }

  private combineAbortSignals(
    signal1: AbortSignal,
    signal2: AbortSignal
  ): AbortSignal {
    const controller = new AbortController();

    const onAbort = () => controller.abort();
    signal1.addEventListener('abort', onAbort, { once: true });
    signal2.addEventListener('abort', onAbort, { once: true });

    return controller.signal;
  }

  private evictIfNeeded(): void {
    const loadedIndices: number[] = [];
    for (const [idx, chunk] of this.chunks) {
      if (chunk.loaded) {
        loadedIndices.push(idx);
      }
    }

    if (loadedIndices.length <= this.maxCachedChunks) return;

    const currentChapter = this.bookIndex
      ? this.getCurrentApproximateIndex()
      : -1;

    const sorted = loadedIndices.sort((a, b) => {
      const distA = Math.abs(a - currentChapter);
      const distB = Math.abs(b - currentChapter);
      return distB - distA;
    });

    const toEvict = sorted.slice(
      0,
      loadedIndices.length - this.maxCachedChunks
    );
    for (const idx of toEvict) {
      const chunk = this.chunks.get(idx);
      if (chunk) {
        chunk.sentences = [];
        chunk.loaded = false;
      }
    }
  }

  private getCurrentApproximateIndex(): number {
    for (const [idx, chunk] of this.chunks) {
      if (chunk.loading) return idx;
    }
    return 0;
  }

  isChapterLoaded(chapterIndex: number): boolean {
    return this.chunks.get(chapterIndex)?.loaded ?? false;
  }

  isChapterLoading(chapterIndex: number): boolean {
    return this.chunks.get(chapterIndex)?.loading ?? false;
  }

  getLoadedChapterCount(): number {
    let count = 0;
    for (const chunk of this.chunks.values()) {
      if (chunk.loaded) count++;
    }
    return count;
  }

  getCachedSentenceCount(): number {
    let count = 0;
    for (const chunk of this.chunks.values()) {
      if (chunk.loaded) count += chunk.sentences.length;
    }
    return count;
  }

  clearCache(): void {
    this.cancelAllLoads();
    for (const chunk of this.chunks.values()) {
      chunk.sentences = [];
      chunk.loaded = false;
      chunk.loading = false;
    }
  }

  destroy(): void {
    this.cancelAllLoads();
    this.bookIndex = null;
    this.clearCache();
    this.chunks.clear();
  }
}
