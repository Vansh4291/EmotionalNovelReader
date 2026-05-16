import { create } from 'zustand';

export const useLibraryStore = create((set, get) => ({
  books: [],
  isLoading: false,
  error: null,
  selectedBook: null,

  setBooks: (books) => set({ books }),
  
  addBook: (book) => set((state) => ({
    books: [...state.books, book]
  })),
  
  removeBook: (bookId) => set((state) => ({
    books: state.books.filter(b => b._id !== bookId)
  })),
  
  updateBook: (bookId, updates) => set((state) => ({
    books: state.books.map(b => b._id === bookId ? { ...b, ...updates } : b)
  })),
  
  setSelectedBook: (book) => set({ selectedBook: book }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null }),
}));

export default useLibraryStore;