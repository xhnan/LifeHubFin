import {authFetch} from './api';

export interface Book {
  id: number;
  name: string;
  description: string;
  ownerId: number;
  defaultCurrency: string;
  coverUrl: string;
  createdAt: string;
  updatedAt: string;
}

/** 获取我的账本列表 */
export async function getMyBooks(): Promise<Book[]> {
  return authFetch<Book[]>('/fin/books/my');
}
