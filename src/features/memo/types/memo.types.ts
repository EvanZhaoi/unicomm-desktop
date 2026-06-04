export interface Memo {
  id: number;
  ownerUsername: string;
  title: string;
  content: string;
  groupId: number;
  groupName: string;
  status: "normal" | "todo" | "done";
  isTop: boolean;
  isFavorite: boolean;
  isOwner: boolean;
  isShared: boolean;
  currentUserPermission: "owner" | "edit" | "view";
  relatedUsers: MemoRelatedUser[];
  tags: MemoTag[];
  createTime: string;
  updateTime: string;
}

export interface MemoRelatedUser {
  id: number;
  username: string;
  employeeNo?: string;
  displayName?: string;
  departmentName?: string;
  email?: string;
  permission: "view" | "edit";
  createTime: string;
  updateTime: string;
}

export interface MemberSearchResult {
  username: string;
  employeeNo: string;
  displayName: string;
  departmentName: string;
  email: string;
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

export interface MemoGroupInput {
  name: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
}

export interface MemoTag {
  id: number;
  name: string;
  color: string;
  createTime: string;
  updateTime: string;
}

export interface MemoTagInput {
  name: string;
  color?: string;
}

export interface MemoCreateInput {
  title?: string;
  content?: string;
  groupId?: number;
  status?: Memo["status"];
  relatedUsernames?: string[];
  relatedUsers?: MemoRelatedUserInput[];
  tagIds?: number[];
}

export interface MemoUpdateInput {
  title: string;
  content: string;
  groupId?: number;
  status: Memo["status"];
  relatedUsernames?: string[];
  relatedUsers?: MemoRelatedUserInput[];
  tagIds?: number[];
}

export interface MemoRelatedUserInput {
  username: string;
  permission: MemoRelatedUser["permission"];
}

export interface MemoListParams {
  page?: number;
  size?: number;
  groupId?: number;
  tagId?: number;
  keyword?: string;
  isShared?: boolean;
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
