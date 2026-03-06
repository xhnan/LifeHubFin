import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {getMyBooks, Book} from '../services/book';
import {
  getAccountCategories,
  Account,
  SubjectCategoriesDTO,
} from '../services/account';
import {getTags, Tag} from '../services/tag';

interface FinanceStoreState {
  books: Book[];
  selectedBookId: number | null;
  accounts: Account[];
  subjectCategories: SubjectCategoriesDTO | null;
  tags: Tag[];
  initializing: boolean;
  initialized: boolean;
  switchBook: (bookId: number) => Promise<void>;
  refreshAll: () => Promise<void>;
  refreshBookData: () => Promise<void>;
}

const FinanceStoreContext = createContext<FinanceStoreState | null>(null);

export const useFinanceStore = (): FinanceStoreState => {
  const ctx = useContext(FinanceStoreContext);
  if (!ctx) {
    throw new Error('useFinanceStore must be used within FinanceStoreProvider');
  }
  return ctx;
};

export const FinanceStoreProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [subjectCategories, setSubjectCategories] =
    useState<SubjectCategoriesDTO | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [initializing, setInitializing] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const bookIdRef = useRef<number | null>(null);

  const loadBookData = useCallback(async (bookId: number) => {
    try {
      const [categories, tgs] = await Promise.all([
        getAccountCategories(bookId).catch(
          () => null as SubjectCategoriesDTO | null,
        ),
        getTags(bookId).catch(() => [] as Tag[]),
      ]);

      if (bookIdRef.current === bookId) {
        const allSubjects = Array.isArray(categories?.allSubjects)
          ? categories!.allSubjects
          : [];
        setSubjectCategories(categories);
        setAccounts(allSubjects);
        setTags(Array.isArray(tgs) ? tgs : []);
      }
    } catch {
      // Ignore and keep existing store state.
    }
  }, []);

  const initStore = useCallback(async () => {
    setInitializing(true);
    try {
      const bks = await getMyBooks();
      setBooks(bks);
      if (bks.length > 0) {
        const firstId = bks[0].id;
        setSelectedBookId(firstId);
        bookIdRef.current = firstId;
        await loadBookData(firstId);
      }
    } catch {
      // Ignore init errors and allow app to continue.
    } finally {
      setInitializing(false);
      setInitialized(true);
    }
  }, [loadBookData]);

  const switchBook = useCallback(
    async (bookId: number) => {
      if (bookId === bookIdRef.current) {
        return;
      }
      setSelectedBookId(bookId);
      bookIdRef.current = bookId;
      await loadBookData(bookId);
    },
    [loadBookData],
  );

  const refreshAll = useCallback(async () => {
    try {
      const bks = await getMyBooks();
      setBooks(bks);

      const currentStillExists = bks.some(b => b.id === bookIdRef.current);
      if (!currentStillExists && bks.length > 0) {
        const firstId = bks[0].id;
        setSelectedBookId(firstId);
        bookIdRef.current = firstId;
      }

      if (bookIdRef.current) {
        await loadBookData(bookIdRef.current);
      }
    } catch {
      // Ignore refresh errors.
    }
  }, [loadBookData]);

  const refreshBookData = useCallback(async () => {
    if (bookIdRef.current) {
      await loadBookData(bookIdRef.current);
    }
  }, [loadBookData]);

  useEffect(() => {
    initStore();
  }, [initStore]);

  const value: FinanceStoreState = {
    books,
    selectedBookId,
    accounts,
    subjectCategories,
    tags,
    initializing,
    initialized,
    switchBook,
    refreshAll,
    refreshBookData,
  };

  return (
    <FinanceStoreContext.Provider value={value}>
      {children}
    </FinanceStoreContext.Provider>
  );
};
