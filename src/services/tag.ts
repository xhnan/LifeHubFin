import {authFetch} from './api';

export interface Tag {
  id: number;
  tagName: string;
  color: string;
  icon: string;
}

/** 获取账本下的标签列表 */
export async function getTags(bookId: number): Promise<Tag[]> {
  return authFetch<Tag[]>(`/fin/tags?bookId=${bookId}`);
}
