import {authFetch} from './api';

export interface Account {
  id: number | string;
  name: string;
  fullName: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  icon: string;
  parentId: number | string | null;
  level: number;
}

/** 获取账本下的科目列表 */
export async function getAccounts(bookId: number): Promise<Account[]> {
  return authFetch<Account[]>(`/fin/accounts?bookId=${bookId}`);
}
