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
