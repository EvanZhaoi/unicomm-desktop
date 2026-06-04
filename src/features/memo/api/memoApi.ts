import { client } from "@/core/http";
import type {
  Memo,
  MemoCreateInput,
  MemoGroup,
  MemoGroupInput,
  MemoListParams,
  MemoRelatedUserInput,
  MemoTag,
  MemoTagInput,
  MemoUpdateInput,
  MemberSearchResult,
  PageResult,
} from "../types/memo.types";

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

export function listMemoTags(): Promise<MemoTag[]> {
  return client.get<MemoTag[], MemoTag[]>("/memo-tags");
}

export function createMemoTag(input: MemoTagInput): Promise<MemoTag> {
  return client.post<MemoTag, MemoTag>("/memo-tags", input);
}

export function updateMemoTag(id: number, input: MemoTagInput): Promise<MemoTag> {
  return client.put<MemoTag, MemoTag>(`/memo-tags/${id}`, input);
}

export function deleteMemoTag(id: number): Promise<void> {
  return client.delete<void, void>(`/memo-tags/${id}`);
}

export function searchMembers(keyword: string, limit = 10): Promise<MemberSearchResult[]> {
  return client.get<MemberSearchResult[], MemberSearchResult[]>("/members/search", {
    params: { keyword, limit },
  });
}
