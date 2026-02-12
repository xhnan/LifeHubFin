import {authFetch} from './api';

const BASE = '/app/fin/transactions';

// ── 月度收支统计 ──
export interface MonthlyStatistics {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export async function getMonthlyStatistics(bookId: number, year?: number, month?: number): Promise<MonthlyStatistics> {
  const q = new URLSearchParams({bookId: String(bookId)});
  if (year) q.append('year', String(year));
  if (month) q.append('month', String(month));
  return authFetch<MonthlyStatistics>(`${BASE}/monthly-statistics?${q}`);
}

// ── 年度收支趋势 ──
export interface MonthTrend {
  month: number;
  income: number;
  expense: number;
  balance: number;
}
export interface YearlyTrend {
  year: number;
  months: MonthTrend[];
}

export async function getYearlyTrend(bookId: number, year?: number): Promise<YearlyTrend> {
  const q = new URLSearchParams({bookId: String(bookId)});
  if (year) q.append('year', String(year));
  return authFetch<YearlyTrend>(`${BASE}/yearly-trend?${q}`);
}

// ── 分类排行 ──
export interface CategoryItem {
  accountId: number;
  accountName: string;
  accountIcon: string;
  amount: number;
  percentage: number;
}
export interface CategoryRank {
  type: string;
  total: number;
  categories: CategoryItem[];
}

export async function getCategoryRank(bookId: number, type?: 'EXPENSE' | 'INCOME', year?: number, month?: number): Promise<CategoryRank> {
  const q = new URLSearchParams({bookId: String(bookId)});
  if (type) q.append('type', type);
  if (year) q.append('year', String(year));
  if (month) q.append('month', String(month));
  return authFetch<CategoryRank>(`${BASE}/category-rank?${q}`);
}

// ── 标签统计 ──
export interface TagStatItem {
  tagId: number;
  tagName: string;
  color: string;
  icon: string;
  amount: number;
  count: number;
  percentage: number;
}
export interface TagStatistics {
  total: number;
  tags: TagStatItem[];
}

export async function getTagStatistics(bookId: number, year?: number, month?: number): Promise<TagStatistics> {
  const q = new URLSearchParams({bookId: String(bookId)});
  if (year) q.append('year', String(year));
  if (month) q.append('month', String(month));
  return authFetch<TagStatistics>(`${BASE}/tag-statistics?${q}`);
}

// ── 资产/负债余额 ──
export interface AccountBalance {
  accountId: number;
  accountName: string;
  accountIcon: string;
  balance: number;
}
export interface AccountBalances {
  accountType: string;
  total: number;
  accounts: AccountBalance[];
}

export async function getAccountBalances(bookId: number, accountType?: 'ASSET' | 'LIABILITY'): Promise<AccountBalances> {
  const q = new URLSearchParams({bookId: String(bookId)});
  if (accountType) q.append('accountType', accountType);
  return authFetch<AccountBalances>(`${BASE}/account-balances?${q}`);
}
