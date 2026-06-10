import { create } from "zustand";
import { queryClient } from "@/core/query/queryClient";
import {
  createMemoGroup,
  createMemo,
  deleteMemoGroup,
  deleteMemo as deleteMemoApi,
  getMemo,
  listMemoGroups,
  listMemos,
  updateMemo,
  updateMemoFavorite,
  updateMemoGroup,
  updateMemoTop,
} from "../api/memoApi";
import { memoQueryKeys } from "../api/memoQueryKeys";
import { translate } from "@/i18n";
import { useSettingStore } from "@/stores/settingStore";
import type {
  Memo,
  MemoGroup,
  MemoGroupInput,
  MemoListParams,
  MemoUpdateInput,
  PageResult,
} from "../types/memo.types";

export type MemoScope = "all" | "related" | "favorite";

interface MemoState {
  memos: Memo[];
  groups: MemoGroup[];
  memoPage: number;
  memoTotal: number;
  hasMoreMemos: boolean;
  selectedMemoId: number | null;
  activeGroupId: number | null;
  activeStatus: Memo["status"] | null;
  activeScope: MemoScope;
  keyword: string;
  isLoading: boolean;
  isLoadingMore: boolean;
  isSaving: boolean;
  error: string | null;
  fetchInitialData: () => Promise<void>;
  fetchMemos: () => Promise<void>;
  fetchNextMemos: () => Promise<void>;
  fetchGroups: () => Promise<void>;
  fetchMemoDetail: (id: number) => Promise<void>;
  focusMemo: (id: number) => Promise<void>;
  setKeyword: (keyword: string) => void;
  setActiveGroup: (groupId: number | null) => void;
  setActiveStatus: (status: Memo["status"] | null) => void;
  setActiveScope: (scope: MemoScope) => void;
  createMemo: () => Promise<void>;
  updateSelectedMemo: (input: MemoUpdateInput) => Promise<void>;
  deleteSelectedMemo: () => Promise<void>;
  deleteMemoById: (id: number) => Promise<void>;
  selectMemo: (id: number | null) => void;
  toggleTop: (id: number) => Promise<void>;
  toggleFavorite: (id: number) => Promise<void>;
  createGroup: (input: MemoGroupInput) => Promise<void>;
  updateGroup: (id: number, input: MemoGroupInput) => Promise<void>;
  deleteGroup: (id: number) => Promise<void>;
}

/*
 * Memo store 负责把后端 API 结果整理成界面可直接消费的状态。
 *
 * 这里不在 WebSocket 事件里直接拼对象。
 * 当前策略是：用户操作时局部更新，提高即时反馈；远端事件或初始化时重新拉取列表，保证最终一致。
 * 服务端数据请求通过 TanStack Query 承接，Zustand 只保留当前视图、选中项和编辑状态。
 */
function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function localized(key: Parameters<typeof translate>[0]): string {
  return translate(key, useSettingStore.getState().language);
}

/*
 * 列表分页策略：
 * - 首屏只拉 30 条，避免用户有大量 Memo 时启动慢。
 * - 滚动到底部再调用 fetchNextMemos() 追加下一页。
 * - 后端允许 size 最大 100，但桌面端默认不一次性拉满，保证主窗口打开速度。
 * - TanStack Query 负责同 key 请求去重和短期缓存，不再手写请求 Map。
 */
const MEMO_PAGE_SIZE = 30;
let initialDataRequest: Promise<void> | null = null;

function requestMemoList(params: MemoListParams): Promise<PageResult<Memo>> {
  return queryClient.fetchQuery({
    queryKey: memoQueryKeys.list(params),
    queryFn: () => listMemos(params),
  });
}

function requestMemoGroups(): Promise<MemoGroup[]> {
  return queryClient.fetchQuery({
    queryKey: memoQueryKeys.groups(),
    queryFn: listMemoGroups,
  });
}

function requestMemoDetail(id: number): Promise<Memo> {
  return queryClient.fetchQuery({
    queryKey: memoQueryKeys.detail(id),
    queryFn: () => getMemo(id),
  });
}

function invalidateMemoLists() {
  void queryClient.invalidateQueries({ queryKey: memoQueryKeys.lists() });
}

function invalidateMemoGroups() {
  void queryClient.invalidateQueries({ queryKey: memoQueryKeys.groups() });
}

function listParams(state: MemoState) {
  // “与我相关”展示别人共享给当前用户的 Memo。共享 Memo 的 groupId 属于创建者，
  // 不能沿用当前用户左侧分组筛选，否则会把合法共享数据过滤掉。
  const groupId = state.activeScope === "related" ? undefined : state.activeGroupId ?? undefined;
  return {
    page: 1,
    size: MEMO_PAGE_SIZE,
    groupId,
    status: state.activeStatus ?? undefined,
    keyword: state.keyword || undefined,
    isShared: state.activeScope === "related" ? true : undefined,
    isFavorite: state.activeScope === "favorite" ? true : undefined,
  };
}

function sortMemos(memos: Memo[]): Memo[] {
  // 前端排序与后端保持一致：置顶优先、更新时间倒序、id 倒序兜底。
  // 局部更新后立即排序，避免保存后位置不变、刷新后又跳到上方造成割裂感。
  return [...memos].sort((left, right) => {
    const topDiff = Number(right.isTop) - Number(left.isTop);
    if (topDiff !== 0) {
      return topDiff;
    }

    const timeDiff = new Date(right.updateTime).getTime() - new Date(left.updateTime).getTime();
    return timeDiff !== 0 ? timeDiff : right.id - left.id;
  });
}

function upsertMemo(memos: Memo[], memo: Memo): Memo[] {
  const exists = memos.some((item) => item.id === memo.id);
  const next = exists ? memos.map((item) => (item.id === memo.id ? memo : item)) : [memo, ...memos];
  return sortMemos(next);
}

function mergeMemoSummary(existing: Memo | undefined, summary: Memo): Memo {
  if (!existing || summary.relatedUsers.length > 0) {
    return summary;
  }

  // 列表接口为了性能只返回摘要字段，relatedUsers 由详情接口维护。
  // 合并列表摘要时保留已加载的相关人，避免 WebSocket/列表刷新把编辑区相关人显示清空。
  return {
    ...summary,
    relatedUsers: existing.relatedUsers,
  };
}

function mergeMemoSummaries(current: Memo[], summaries: Memo[]): Memo[] {
  const currentMap = new Map(current.map((memo) => [memo.id, memo]));
  return sortMemos(summaries.map((memo) => mergeMemoSummary(currentMap.get(memo.id), memo)));
}

function appendMemoSummaries(current: Memo[], summaries: Memo[]): Memo[] {
  // 追加分页时不覆盖已有详情，避免用户正在编辑的 Memo 被列表摘要冲掉相关人或权限字段。
  const currentMap = new Map(current.map((memo) => [memo.id, memo]));
  const next = [...current];
  for (const summary of summaries) {
    if (!currentMap.has(summary.id)) {
      next.push(mergeMemoSummary(undefined, summary));
    }
  }
  return sortMemos(next);
}

export const useMemoStore = create<MemoState>((set, get) => ({
  memos: [],
  groups: [],
  memoPage: 1,
  memoTotal: 0,
  hasMoreMemos: false,
  selectedMemoId: null,
  activeGroupId: null,
  activeStatus: null,
  activeScope: "all",
  keyword: "",
  isLoading: false,
  isLoadingMore: false,
  isSaving: false,
  error: null,

  fetchInitialData: async () => {
    if (initialDataRequest) {
      return initialDataRequest;
    }

    initialDataRequest = (async () => {
      set((state) => ({ isLoading: state.memos.length === 0, error: null }));
      try {
        // 首屏需要分组和完整 Memo 列表一起加载；并发触发时复用同一个请求，避免刷新时重复调用。
        const [groups, result] = await Promise.all([requestMemoGroups(), requestMemoList(listParams(get()))]);
        set((state) => ({
          groups,
          memos: mergeMemoSummaries(state.memos, result.list),
          memoPage: result.page,
          memoTotal: result.total,
          hasMoreMemos: result.page < result.pages,
          selectedMemoId:
            state.selectedMemoId && result.list.some((memo) => memo.id === state.selectedMemoId)
              ? state.selectedMemoId
              : result.list[0]?.id ?? null,
          isLoading: false,
        }));
      } catch (error) {
        set({ error: errorMessage(error, localized("memo.errors.load")), isLoading: false });
      }
    })().finally(() => {
      initialDataRequest = null;
    });

    return initialDataRequest;
  },

  fetchMemos: async () => {
    set((state) => ({ isLoading: state.memos.length === 0, error: null }));
    try {
      const result = await requestMemoList(listParams(get()));
      set((state) => ({
        memos: mergeMemoSummaries(state.memos, result.list),
        memoPage: result.page,
        memoTotal: result.total,
        hasMoreMemos: result.page < result.pages,
        // 如果当前选中的 Memo 仍在新列表里，就保持选中；否则自动选中第一条，避免右侧编辑器悬空。
        selectedMemoId:
          state.selectedMemoId && result.list.some((memo) => memo.id === state.selectedMemoId)
            ? state.selectedMemoId
            : result.list[0]?.id ?? null,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: errorMessage(error, localized("memo.errors.load")), isLoading: false });
    }
  },

  fetchNextMemos: async () => {
    const { isLoading, isLoadingMore, hasMoreMemos, memoPage } = get();
    if (isLoading || isLoadingMore || !hasMoreMemos) {
      return;
    }

    set({ isLoadingMore: true, error: null });
    try {
      const result = await requestMemoList({ ...listParams(get()), page: memoPage + 1 });
      set((state) => {
        return {
          memos: appendMemoSummaries(state.memos, result.list),
          memoPage: result.page,
          memoTotal: result.total,
          hasMoreMemos: result.page < result.pages,
          isLoadingMore: false,
        };
      });
    } catch (error) {
      set({ error: errorMessage(error, localized("memo.errors.load")), isLoadingMore: false });
    }
  },

  fetchGroups: async () => {
    try {
      const groups = await requestMemoGroups();
      set({ groups });
    } catch (error) {
      set({ error: errorMessage(error, localized("memo.errors.load")) });
    }
  },

  fetchMemoDetail: async (id) => {
    try {
      const memo = await requestMemoDetail(id);
      set((state) => ({
        memos: state.memos.map((item) => (item.id === id ? { ...item, ...memo } : item)),
      }));
    } catch (error) {
      set({ error: errorMessage(error, localized("memo.errors.load")) });
    }
  },

  focusMemo: async (id) => {
    set({ error: null });
    try {
      const memo = await requestMemoDetail(id);
      set((state) => ({
        // 通知跳转可能打开当前分页/筛选条件之外的 Memo，因此需要插入到本地列表后再选中。
        memos: upsertMemo(state.memos, memo),
        selectedMemoId: memo.id,
      }));
    } catch (error) {
      set({ error: errorMessage(error, localized("memo.errors.load")) });
    }
  },

  setKeyword: (keyword) => {
    set({ keyword });
  },

  setActiveGroup: (groupId) => {
    set({ activeGroupId: groupId });
  },

  setActiveStatus: (status) => {
    set({ activeStatus: status });
  },

  setActiveScope: (scope) => {
    set((state) => ({
      activeScope: scope,
      activeGroupId: scope === "related" ? null : state.activeGroupId,
    }));
  },

  createMemo: async () => {
    set({ isSaving: true, error: null });
    try {
      const { activeGroupId, activeStatus, groups } = get();
      // 未选择分组时使用第一个分组。后端也会保证默认分组存在，这里是为了前端请求更明确。
      const fallbackGroupId = activeGroupId ?? groups[0]?.id;
      const memo = await createMemo({
        title: "",
        content: "",
        groupId: fallbackGroupId,
        status: activeStatus ?? "normal",
      });
      queryClient.setQueryData(memoQueryKeys.detail(memo.id), memo);
      invalidateMemoLists();
      invalidateMemoGroups();
      const refreshedGroups = await requestMemoGroups();
      set((state) => ({
        // 创建后按统一规则插入列表：置顶优先，其次按更新时间倒序。
        memos: upsertMemo(state.memos, memo),
        groups: refreshedGroups,
        memoTotal: state.memoTotal + 1,
        activeScope: "all",
        selectedMemoId: memo.id,
        isSaving: false,
      }));
    } catch (error) {
      set({ error: errorMessage(error, localized("memo.errors.create")), isSaving: false });
    }
  },

  updateSelectedMemo: async (input) => {
    const selectedMemoId = get().selectedMemoId;
    if (!selectedMemoId) {
      return;
    }

    set({ isSaving: true, error: null });
    try {
      const memo = await updateMemo(selectedMemoId, input);
      queryClient.setQueryData(memoQueryKeys.detail(selectedMemoId), memo);
      invalidateMemoLists();
      set((state) => ({
        memos: upsertMemo(state.memos, memo),
        isSaving: false,
      }));
    } catch (error) {
      set({ error: errorMessage(error, localized("memo.errors.save")), isSaving: false });
      throw error;
    }
  },

  deleteSelectedMemo: async () => {
    const selectedMemoId = get().selectedMemoId;
    if (!selectedMemoId) {
      return;
    }

    set({ isSaving: true, error: null });
    try {
      await get().deleteMemoById(selectedMemoId);
    } catch (error) {
      set({ error: errorMessage(error, localized("memo.errors.delete")), isSaving: false });
    }
  },

  deleteMemoById: async (id) => {
    set({ isSaving: true, error: null });
    try {
      await deleteMemoApi(id);
      queryClient.removeQueries({ queryKey: memoQueryKeys.detail(id) });
      invalidateMemoLists();
      invalidateMemoGroups();
      const refreshedGroups = await requestMemoGroups();
      set((state) => {
        // 删除后重新选择列表第一条，保持编辑器始终指向有效 Memo。
        const memos = state.memos.filter((memo) => memo.id !== id);
        return {
          memos,
          groups: refreshedGroups,
          memoTotal: Math.max(0, state.memoTotal - 1),
          selectedMemoId: state.selectedMemoId === id ? memos[0]?.id ?? null : state.selectedMemoId,
          isSaving: false,
        };
      });
    } catch (error) {
      set({ error: errorMessage(error, localized("memo.errors.delete")), isSaving: false });
    }
  },

  selectMemo: (id) => {
    set({ selectedMemoId: id });
  },

  toggleTop: async (id) => {
    const memo = get().memos.find((item) => item.id === id);
    if (!memo) {
      return;
    }
    const updated = await updateMemoTop(id, !memo.isTop);
    queryClient.setQueryData(memoQueryKeys.detail(id), updated);
    invalidateMemoLists();
    set((state) => ({
      memos: state.memos
        .map((item) => (item.id === id ? updated : item))
        .sort((left, right) => Number(right.isTop) - Number(left.isTop) || new Date(right.updateTime).getTime() - new Date(left.updateTime).getTime() || right.id - left.id),
    }));
  },

  toggleFavorite: async (id) => {
    const memo = get().memos.find((item) => item.id === id);
    if (!memo) {
      return;
    }
    const updated = await updateMemoFavorite(id, !memo.isFavorite);
    queryClient.setQueryData(memoQueryKeys.detail(id), updated);
    invalidateMemoLists();
    set((state) => ({
      memos:
        state.activeScope === "favorite" && !updated.isFavorite
          ? state.memos.filter((item) => item.id !== id)
          : upsertMemo(state.memos, updated),
      memoTotal: state.activeScope === "favorite" && !updated.isFavorite ? Math.max(0, state.memoTotal - 1) : state.memoTotal,
      selectedMemoId:
        state.activeScope === "favorite" && !updated.isFavorite && state.selectedMemoId === id
          ? state.memos.find((item) => item.id !== id)?.id ?? null
          : state.selectedMemoId,
    }));
  },

  createGroup: async (input) => {
    set({ isSaving: true, error: null });
    try {
      await createMemoGroup(input);
      invalidateMemoGroups();
      await get().fetchGroups();
      set({ isSaving: false });
    } catch (error) {
      set({ error: errorMessage(error, localized("memo.group.errors.save")), isSaving: false });
    }
  },

  updateGroup: async (id, input) => {
    set({ isSaving: true, error: null });
    try {
      await updateMemoGroup(id, input);
      invalidateMemoGroups();
      await get().fetchGroups();
      set({ isSaving: false });
    } catch (error) {
      set({ error: errorMessage(error, localized("memo.group.errors.save")), isSaving: false });
    }
  },

  deleteGroup: async (id) => {
    set({ isSaving: true, error: null });
    try {
      await deleteMemoGroup(id);
      invalidateMemoGroups();
      invalidateMemoLists();
      const groups = await requestMemoGroups();
      const activeGroupId = get().activeGroupId === id ? null : get().activeGroupId;
      set({ activeGroupId });
      const result = await requestMemoList(listParams(get()));
      set({
        groups,
        activeGroupId,
        memos: sortMemos(result.list),
        memoPage: result.page,
        memoTotal: result.total,
        hasMoreMemos: result.page < result.pages,
        selectedMemoId: result.list[0]?.id ?? null,
        isSaving: false,
      });
    } catch (error) {
      set({ error: errorMessage(error, localized("memo.group.errors.delete")), isSaving: false });
    }
  },

}));
