export interface Memo {
  id: number;
  title: string;
  content: string;
  groupId: number;
  groupName: string;
  status: "normal" | "todo" | "done";
  isTop: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  createTime: string;
  updateTime: string;
}

export interface MemoGroup {
  id: number;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  isDefault: boolean;
  memoCount: number;
  createTime: string;
  updateTime: string;
}

export interface MemoCreateInput {
  title?: string;
  content?: string;
  groupId?: number;
  status?: Memo["status"];
}

export interface MemoUpdateInput {
  title: string;
  content: string;
  groupId: number;
  status: Memo["status"];
}

export interface MemoListParams {
  page?: number;
  size?: number;
  groupId?: number;
  keyword?: string;
  isArchived?: boolean;
  isFavorite?: boolean;
  status?: Memo["status"];
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
