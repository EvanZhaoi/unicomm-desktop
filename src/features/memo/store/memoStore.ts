import { create } from "zustand";
import {
  createMemoGroup,
  createMemo,
  deleteMemoGroup,
  deleteMemo,
  listMemoGroups,
  listMemos,
  updateMemo,
  updateMemoArchive,
  updateMemoFavorite,
  updateMemoGroup,
  updateMemoTop,
} from "../api/memoApi";
import { translate } from "@/i18n";
import { useSettingStore } from "@/stores/settingStore";
import type { Memo, MemoGroup, MemoGroupInput, MemoUpdateInput } from "../types/memo.types";

export type MemoScope = "all" | "favorite" | "archived";

interface MemoState {
  memos: Memo[];
  groups: MemoGroup[];
  selectedMemoId: number | null;
  activeGroupId: number | null;
  activeStatus: Memo["status"] | null;
  activeScope: MemoScope;
  keyword: string;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  fetchInitialData: () => Promise<void>;
  fetchMemos: () => Promise<void>;
  setKeyword: (keyword: string) => void;
  setActiveGroup: (groupId: number | null) => void;
  setActiveStatus: (status: Memo["status"] | null) => void;
  setActiveScope: (scope: MemoScope) => void;
  createMemo: () => Promise<void>;
  updateSelectedMemo: (input: MemoUpdateInput) => Promise<void>;
  deleteSelectedMemo: () => Promise<void>;
  selectMemo: (id: number | null) => void;
  toggleTop: (id: number) => Promise<void>;
  toggleFavorite: (id: number) => Promise<void>;
  toggleArchive: (id: number) => Promise<void>;
  createGroup: (input: MemoGroupInput) => Promise<void>;
  updateGroup: (id: number, input: MemoGroupInput) => Promise<void>;
  deleteGroup: (id: number) => Promise<void>;
}

/*
 * Memo store 负责把后端 API 结果整理成界面可直接消费的状态。
 *
 * 这里不缓存归档列表，也不在 WebSocket 事件里直接拼对象。
 * 当前策略是：用户操作时局部更新，提高即时反馈；远端事件或初始化时重新拉取列表，保证最终一致。
 */
function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function localized(key: Parameters<typeof translate>[0]): string {
  return translate(key, useSettingStore.getState().language);
}

function listParams(state: MemoState) {
  return {
    page: 1,
    size: 50,
    groupId: state.activeGroupId ?? undefined,
    status: state.activeStatus ?? undefined,
    keyword: state.keyword || undefined,
    isArchived: state.activeScope === "archived",
    isFavorite: state.activeScope === "favorite" ? true : undefined,
  };
}

export const useMemoStore = create<MemoState>((set, get) => ({
  memos: [],
  groups: [],
  selectedMemoId: null,
  activeGroupId: null,
  activeStatus: null,
  activeScope: "all",
  keyword: "",
  isLoading: false,
  isSaving: false,
  error: null,

  fetchInitialData: async () => {
    set({ isLoading: true, error: null });
    try {
      // 首屏需要分组和 Memo 列表一起加载；默认选中第一条 Memo，保证编辑区有稳定目标。
      const groups = await listMemoGroups();
      const result = await listMemos(listParams(get()));
      set({
        groups,
        memos: result.list,
        selectedMemoId: result.list[0]?.id ?? null,
        isLoading: false,
      });
    } catch (error) {
      set({ error: errorMessage(error, localized("memo.errors.load")), isLoading: false });
    }
  },

  fetchMemos: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await listMemos(listParams(get()));
      set((state) => ({
        memos: result.list,
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
    set({ activeScope: scope });
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
      const refreshedGroups = await listMemoGroups();
      set((state) => ({
        // 创建成功后先把新 Memo 放到当前列表顶部，随后 WebSocket 事件也可能触发一次全量刷新。
        memos: [memo, ...state.memos],
        groups: refreshedGroups,
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
      set((state) => ({
        memos: state.memos.map((item) => (item.id === memo.id ? memo : item)),
        isSaving: false,
      }));
    } catch (error) {
      set({ error: errorMessage(error, localized("memo.errors.save")), isSaving: false });
    }
  },

  deleteSelectedMemo: async () => {
    const selectedMemoId = get().selectedMemoId;
    if (!selectedMemoId) {
      return;
    }

    set({ isSaving: true, error: null });
    try {
      await deleteMemo(selectedMemoId);
      const refreshedGroups = await listMemoGroups();
      set((state) => {
        // 删除后重新选择列表第一条，保持编辑器始终指向有效 Memo。
        const memos = state.memos.filter((memo) => memo.id !== selectedMemoId);
        return {
          memos,
          groups: refreshedGroups,
          selectedMemoId: memos[0]?.id ?? null,
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
    set((state) => ({
      memos: state.memos.map((item) => (item.id === id ? updated : item)),
    }));
  },

  toggleFavorite: async (id) => {
    const memo = get().memos.find((item) => item.id === id);
    if (!memo) {
      return;
    }
    const updated = await updateMemoFavorite(id, !memo.isFavorite);
    set((state) => ({
      memos:
        state.activeScope === "favorite" && !updated.isFavorite
          ? state.memos.filter((item) => item.id !== id)
          : state.memos.map((item) => (item.id === id ? updated : item)),
      selectedMemoId:
        state.activeScope === "favorite" && !updated.isFavorite && state.selectedMemoId === id
          ? state.memos.find((item) => item.id !== id)?.id ?? null
          : state.selectedMemoId,
    }));
  },

  toggleArchive: async (id) => {
    const memo = get().memos.find((item) => item.id === id);
    if (!memo) {
      return;
    }
    await updateMemoArchive(id, !memo.isArchived);
    const refreshedGroups = await listMemoGroups();
    const result = await listMemos(listParams(get()));
    set((state) => ({
      memos: result.list,
      selectedMemoId:
        state.selectedMemoId && result.list.some((item) => item.id === state.selectedMemoId)
          ? state.selectedMemoId
          : result.list[0]?.id ?? null,
      groups: refreshedGroups,
    }));
  },

  createGroup: async (input) => {
    set({ isSaving: true, error: null });
    try {
      await createMemoGroup(input);
      const groups = await listMemoGroups();
      set({ groups, isSaving: false });
    } catch (error) {
      set({ error: errorMessage(error, localized("memo.group.errors.save")), isSaving: false });
    }
  },

  updateGroup: async (id, input) => {
    set({ isSaving: true, error: null });
    try {
      await updateMemoGroup(id, input);
      const groups = await listMemoGroups();
      set({ groups, isSaving: false });
    } catch (error) {
      set({ error: errorMessage(error, localized("memo.group.errors.save")), isSaving: false });
    }
  },

  deleteGroup: async (id) => {
    set({ isSaving: true, error: null });
    try {
      await deleteMemoGroup(id);
      const groups = await listMemoGroups();
      const activeGroupId = get().activeGroupId === id ? null : get().activeGroupId;
      set({ activeGroupId });
      const result = await listMemos(listParams(get()));
      set({
        groups,
        activeGroupId,
        memos: result.list,
        selectedMemoId: result.list[0]?.id ?? null,
        isSaving: false,
      });
    } catch (error) {
      set({ error: errorMessage(error, localized("memo.group.errors.delete")), isSaving: false });
    }
  },
}));
