import type { MemoListParams } from "../types/memo.types";

function normalizeListParams(params: MemoListParams) {
  return {
    page: params.page ?? 1,
    size: params.size ?? 30,
    groupId: params.groupId ?? null,
    status: params.status ?? null,
    keyword: params.keyword ?? "",
    isShared: params.isShared ?? null,
    isFavorite: params.isFavorite ?? null,
  };
}

/**
 * Memo 模块 TanStack Query key 工厂。
 *
 * 所有 key 都集中在这里，后续 WebSocket 事件或 mutation 成功后可以精准失效
 * 列表、详情或分组缓存，不需要在多个文件里手写字符串。
 */
export const memoQueryKeys = {
  all: ["memo"] as const,
  lists: () => [...memoQueryKeys.all, "list"] as const,
  list: (params: MemoListParams) => [...memoQueryKeys.lists(), normalizeListParams(params)] as const,
  detail: (id: number) => [...memoQueryKeys.all, "detail", id] as const,
  groups: () => [...memoQueryKeys.all, "groups"] as const,
};
