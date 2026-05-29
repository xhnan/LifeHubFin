import {authFetch} from './api';

export interface Account {
  id: number | string;
  name: string;
  fullName?: string;
  code?: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  icon: string;
  userSort?: number;
  sortWeight?: number;
  parentId?: number | string | null;
  level?: number;
}

export interface ExpenseCategories {
  occurrenceSubjects: Account[];
  paymentSubjects: Account[];
}

export interface IncomeCategories {
  occurrenceSubjects: Account[];
  receiptSubjects: Account[];
}

export interface SubjectCategoriesDTO {
  expense: ExpenseCategories;
  income: IncomeCategories;
  allSubjects: Account[];
}

/** 閼惧嘲褰囩拹锔芥拱閻ㄥ嫮顫栭惄顔煎瀻缁紮绱欓幐澶嬫暜閸?閺€璺哄弳閸掑棛琚敍?*/
export async function getAccountCategories(
  bookId: number,
): Promise<SubjectCategoriesDTO> {
  return authFetch<SubjectCategoriesDTO>(
    `/fin/accounts/categories?bookId=${bookId}`,
  );
}

/** 閼惧嘲褰囩拹锔芥拱缁夋垹娲伴崚妤勩€冮敍鍫濆悑鐎硅妫拫鍐暏閺傜櫢绱濈€圭偤妾潻鏂挎礀 allSubjects閿?*/
export async function getAccounts(bookId: number): Promise<Account[]> {
  const data = await getAccountCategories(bookId);
  const subjects = Array.isArray(data?.allSubjects) ? data.allSubjects : [];

  // Keep fields used by existing UI stable even if backend no longer returns tree metadata.
  return subjects.map(subject => ({
    ...subject,
    fullName: subject.fullName ?? subject.name,
    parentId: subject.parentId ?? null,
    level: subject.level ?? 0,
  }));
}

export interface SortWeightUpdate {
  id: number | string;
  userSort: number | null;
  sortWeight: number | null;
}

export function getAccountSortValue(account: Account): number {
  return account.userSort ?? account.sortWeight ?? 0;
}

/** 批量更新账户排序权重 */
export async function updateAccountOrders(
  bookId: number,
  items: SortWeightUpdate[],
): Promise<void> {
  return authFetch<void>('/fin/accounts/sort-weight', {
    method: 'PUT',
    body: JSON.stringify({bookId, items}),
  });
}
