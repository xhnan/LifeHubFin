import {authFetch} from './api';

export interface TagInfo {
  tagId: number;
  tagName: string;
  color: string;
  icon: string;
}

export interface TransactionItem {
  transId: number;
  transDate: string;
  transType: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'OTHER';
  displayAmount: number;
  description: string;
  categoryName: string;
  categoryIcon: string;
  targetAccountName: string;
  targetAccountIcon: string;
  tags: TagInfo[];
}

export interface TransactionDetail {
  transId: number;
  transDate: string;
  transType: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'OTHER';
  description: string;
  amount: string;
  attachmentId?: string;
  bookId: number;
  tags: TagInfo[];
  entries: TransactionEntry[];
}

export interface TransactionEntry {
  entryId: number;
  accountId: number;
  accountName: string;
  accountIcon: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  direction: 'DEBIT' | 'CREDIT';
  amount: string;
  memo?: string;
  quantity?: string;
  price?: string;
  commodityCode?: string;
}

export interface DailyGroup {
  date: string;
  dailyIncome: number;
  dailyExpense: number;
  transactions: TransactionItem[];
}

export interface TransactionDetailResult {
  dailyGroups: DailyGroup[];
  total: number;
  pageNum: number;
  pageSize: number;
}

export interface TransactionQuery {
  bookId: number;
  startDate?: string;
  endDate?: string;
  pageNum?: number;
  pageSize?: number;
}

/** 查询交易流水明细 */
export async function getTransactionDetails(
  params: TransactionQuery,
): Promise<TransactionDetailResult> {
  const query = new URLSearchParams();
  query.append('bookId', String(params.bookId));
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.pageNum) query.append('pageNum', String(params.pageNum));
  if (params.pageSize) query.append('pageSize', String(params.pageSize));

  return authFetch<TransactionDetailResult>(
    `/app/fin/transactions/details?${query.toString()}`,
  );
}

/** 获取单个交易详情（包含完整分录） */
export async function getTransactionDetail(
  transId: number,
): Promise<TransactionDetail> {
  return authFetch<TransactionDetail>(`/fin/transactions/with-entries/${transId}`);
}

/** 分录请求 */
export interface EntryRequest {
  accountId: number | string;
  direction: 'DEBIT' | 'CREDIT';
  amount: string;
  memo?: string;
  quantity?: string | null;
  price?: string | null;
  commodityCode?: string | null;
}

/** 创建交易请求 */
export interface CreateTransactionRequest {
  transDate: string;
  description: string;
  attachmentId?: string;
  bookId: number;
  tagIds?: number[];
  entries: EntryRequest[];
}

/** 创建交易响应 */
export interface CreateTransactionResponse {
  transId: number;
  transDate: string;
  description: string;
}

/** 创建交易及分录（复式记账） */
export async function createTransaction(
  data: CreateTransactionRequest,
): Promise<CreateTransactionResponse> {
  return authFetch<CreateTransactionResponse>('/fin/transactions/with-entries', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** 更新交易请求 */
export interface UpdateTransactionRequest {
  transDate?: string;
  description?: string;
  attachmentId?: string;
  tagIds?: number[];
  entries: EntryRequest[];
}

/** 更新交易及分录（复式记账） */
export async function updateTransaction(
  transId: number,
  data: UpdateTransactionRequest,
): Promise<boolean> {
  return authFetch<boolean>(`/fin/transactions/with-entries/${transId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/** 删除交易记录 */
export async function deleteTransaction(transId: number): Promise<boolean> {
  return authFetch<boolean>(`/fin/transactions/${transId}`, {
    method: 'DELETE',
  });
}
