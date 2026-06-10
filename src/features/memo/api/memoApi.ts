import { client } from "@/core/http";
import type {
  Memo,
  MemoCreateInput,
  MemoGroup,
  MemoGroupInput,
  MemoListParams,
  MemoRelatedUserInput,
  MemoUpdateInput,
  MemberSearchResult,
  PageResult,
} from "../types/memo.types";

/*
 * Memo API 边界层。
 *
 * 约定：
 * - 组件和 store 只能调用这里的函数，不直接拼接 URL。
 * - 这里保持“薄封装”，不写业务判断；权限、排序、过滤最终由后端决定。
 * - client 已经统一处理 baseURL、Sa-Token、错误转换和 Result<T> 解包。
 */
export function listMemos(params: MemoListParams): Promise<PageResult<Memo>> {
  return client.get<PageResult<Memo>, PageResult<Memo>>("/memos", { params });
}

export function getMemo(id: number): Promise<Memo> {
  return client.get<Memo, Memo>(`/memos/${id}`);
}

export function createMemo(input: MemoCreateInput): Promise<Memo> {
  return client.post<Memo, Memo>("/memos", input);
}

export function updateMemo(id: number, input: MemoUpdateInput): Promise<Memo> {
  return client.put<Memo, Memo>(`/memos/${id}`, input);
}

export function updateMemoRelatedUsers(id: number, relatedUsers: MemoRelatedUserInput[]): Promise<Memo> {
  return client.put<Memo, Memo>(`/memos/${id}/related-users`, { relatedUsers });
}

export function deleteMemo(id: number): Promise<void> {
  return client.delete<void, void>(`/memos/${id}`);
}

export function updateMemoTop(id: number, value: boolean): Promise<Memo> {
  return client.patch<Memo, Memo>(`/memos/${id}/top`, { value });
}

export function updateMemoFavorite(id: number, value: boolean): Promise<Memo> {
  return client.patch<Memo, Memo>(`/memos/${id}/favorite`, { value });
}

export function listMemoGroups(): Promise<MemoGroup[]> {
  return client.get<MemoGroup[], MemoGroup[]>("/memo-groups");
}

export function createMemoGroup(input: MemoGroupInput): Promise<MemoGroup> {
  return client.post<MemoGroup, MemoGroup>("/memo-groups", input);
}

export function updateMemoGroup(id: number, input: MemoGroupInput): Promise<MemoGroup> {
  return client.put<MemoGroup, MemoGroup>(`/memo-groups/${id}`, input);
}

export function deleteMemoGroup(id: number): Promise<void> {
  return client.delete<void, void>(`/memo-groups/${id}`);
}

export function searchMembers(keyword: string, limit = 10): Promise<MemberSearchResult[]> {
  // 测试阶段该接口由 mock 人员源提供；未来接入企业人员 API 时，前端调用方式保持不变。
  return client.get<MemberSearchResult[], MemberSearchResult[]>("/members/search", {
    params: { keyword, limit },
  });
}
