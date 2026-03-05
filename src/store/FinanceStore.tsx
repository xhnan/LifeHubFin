import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getMyBooks, Book } from '../services/book';
import { getAccounts, Account } from '../services/account';
import { getTags, Tag } from '../services/tag';

interface FinanceStoreState {
    /** 所有账本 */
    books: Book[];
    /** 当前选中的 bookId */
    selectedBookId: number | null;
    /** 当前 book 下的所有科目（含树结构） */
    accounts: Account[];
    /** 当前 book 下的标签 */
    tags: Tag[];
    /** 是否正在初始化（首次加载） */
    initializing: boolean;
    /** 是否已完成首次初始化 */
    initialized: boolean;

    /** 切换账本（同时刷新科目+标签） */
    switchBook: (bookId: number) => Promise<void>;
    /** 手动刷新全部数据（强制重新请求） */
    refreshAll: () => Promise<void>;
    /** 仅刷新科目 + 标签 */
    refreshBookData: () => Promise<void>;
}

const FinanceStoreContext = createContext<FinanceStoreState | null>(null);

/** 获取全局财务数据 */
export const useFinanceStore = (): FinanceStoreState => {
    const ctx = useContext(FinanceStoreContext);
    if (!ctx) throw new Error('useFinanceStore must be used within FinanceStoreProvider');
    return ctx;
};

export const FinanceStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [books, setBooks] = useState<Book[]>([]);
    const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [initializing, setInitializing] = useState(true);
    const [initialized, setInitialized] = useState(false);

    // 使用 ref 追踪 bookId 防止闭包问题
    const bookIdRef = useRef<number | null>(null);

    /** 根据 bookId 加载科目和标签 */
    const loadBookData = useCallback(async (bookId: number) => {
        try {
            const [accs, tgs] = await Promise.all([
                getAccounts(bookId).catch(() => [] as Account[]),
                getTags(bookId).catch(() => [] as Tag[]),
            ]);
            // 仅当 bookId 仍为当前值时才更新（防止切换竞争）
            if (bookIdRef.current === bookId) {
                setAccounts(Array.isArray(accs) ? accs : []);
                setTags(Array.isArray(tgs) ? tgs : []);
            }
        } catch {
            // 静默失败
        }
    }, []);

    /** 初始化：加载账本列表 → 选中第一个 → 加载科目+标签 */
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
            // 加载失败，后续页面可以降级处理
        } finally {
            setInitializing(false);
            setInitialized(true);
        }
    }, [loadBookData]);

    /** 切换账本 */
    const switchBook = useCallback(async (bookId: number) => {
        if (bookId === bookIdRef.current) return;
        setSelectedBookId(bookId);
        bookIdRef.current = bookId;
        await loadBookData(bookId);
    }, [loadBookData]);

    /** 刷新全部（重新拉取账本+科目+标签） */
    const refreshAll = useCallback(async () => {
        try {
            const bks = await getMyBooks();
            setBooks(bks);
            // 如果当前 bookId 仍然存在，保持选中；否则切到第一个
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
            // 静默
        }
    }, [loadBookData]);

    /** 仅刷新当前账本的科目 + 标签 */
    const refreshBookData = useCallback(async () => {
        if (bookIdRef.current) {
            await loadBookData(bookIdRef.current);
        }
    }, [loadBookData]);

    // 组件挂载时自动初始化
    useEffect(() => {
        initStore();
    }, [initStore]);

    const value: FinanceStoreState = {
        books,
        selectedBookId,
        accounts,
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
