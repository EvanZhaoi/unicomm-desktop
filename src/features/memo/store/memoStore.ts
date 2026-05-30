import { create } from "zustand";
import {
  createMemo,
  deleteMemo,
  listMemoGroups,
  listMemos,
  updateMemo,
  updateMemoArchive,
  updateMemoFavorite,
  updateMemoTop,
} from "../api/memoApi";
import { translate } from "@/i18n";
import { useSettingStore } from "@/stores/settingStore";
import type { Memo, MemoGroup, MemoUpdateInput } from "../types/memo.types";

interface MemoState {
  memos: Memo[];
  groups: MemoGroup[];
  selectedMemoId: number | null;
  activeGroupId: number | null;
  keyword: string;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  fetchInitialData: () => Promise<void>;
  fetchMemos: () => Promise<void>;
  setKeyword: (keyword: string) => void;
  setActiveGroup: (groupId: number | null) => void;
  createMemo: () => Promise<void>;
  updateSelectedMemo: (input: MemoUpdateInput) => Promise<void>;
  deleteSelectedMemo: () => Promise<void>;
  selectMemo: (id: number | null) => void;
  toggleTop: (id: number) => Promise<void>;
  toggleFavorite: (id: number) => Promise<void>;
  toggleArchive: (id: number) => Promise<void>;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function localized(key: Parameters<typeof translate>[0]): string {
  return translate(key, useSettingStore.getState().language);
}

export const useMemoStore = create<MemoState>((set, get) => ({
  memos: [],
  groups: [],
  selectedMemoId: null,
  activeGroupId: null,
  keyword: "",
  isLoading: false,
  isSaving: false,
  error: null,

  fetchInitialData: async () => {
    set({ isLoading: true, error: null });
    try {
      const groups = await listMemoGroups();
      const result = await listMemos({ page: 1, size: 50, isArchived: false });
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
      const { activeGroupId, keyword } = get();
      const result = await listMemos({
        page: 1,
        size: 50,
        groupId: activeGroupId ?? undefined,
        keyword: keyword || undefined,
        isArchived: false,
      });
      set((state) => ({
        memos: result.list,
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

  createMemo: async () => {
    set({ isSaving: true, error: null });
    try {
      const { activeGroupId, groups } = get();
      const fallbackGroupId = activeGroupId ?? groups[0]?.id;
      const memo = await createMemo({
        title: "无标题",
        content: "",
        groupId: fallbackGroupId,
        status: "normal",
      });
      const refreshedGroups = await listMemoGroups();
      set((state) => ({
        memos: [memo, ...state.memos],
        groups: refreshedGroups,
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
      memos: state.memos.map((item) => (item.id === id ? updated : item)),
    }));
  },

  toggleArchive: async (id) => {
    const memo = get().memos.find((item) => item.id === id);
    if (!memo) {
      return;
    }
    const updated = await updateMemoArchive(id, !memo.isArchived);
    set((state) => ({
      memos: state.memos.filter((item) => item.id !== id),
      selectedMemoId: state.selectedMemoId === id ? state.memos.find((item) => item.id !== id)?.id ?? null : state.selectedMemoId,
      groups: state.groups.map((group) =>
        group.id === updated.groupId ? { ...group, memoCount: Math.max(0, group.memoCount - 1) } : group
      ),
    }));
  },
}));
