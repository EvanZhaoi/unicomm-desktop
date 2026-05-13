/**
 * 备忘录状态管理模块 (Zustand Store)
 * 
 * 管理备忘录的客户端状态，包括：
 * - 备忘录列表数据
 * - 当前选中的备忘录
 * - 加载状态和错误状态
 * 
 * ## 功能规划（骨架阶段）
 * 
 * ### 待实现功能
 * - [ ] 加载备忘录列表（fetchMemos）
 * - [ ] 创建新备忘录（createMemo）
 * - [ ] 更新备忘录（updateMemo）
 * - [ ] 删除备忘录（deleteMemo）
 * - [ ] 置顶/取消置顶（togglePin）
 * - [ ] 归档/恢复归档（toggleArchive）
 * 
 * ## 使用示例
 * ```typescript
 * import { useMemoStore } from '@/features/memo/store/memoStore';
 * 
 * function MemoList() {
 *   const { memos, isLoading, fetchMemos } = useMemoStore();
 * 
 *   useEffect(() => {
 *     fetchMemos();
 *   }, []);
 * 
 *   if (isLoading) {
 *     return <div>加载中...</div>;
 *   }
 * 
 *   return (
 *     <div>
 *       {memos.map(memo => (
 *         <MemoItem key={memo.id} memo={memo} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 * 
 * @module features/memo/store
 * @requires zustand
 */

import { create } from "zustand";

/**
 * 备忘录列表项（精简版）
 * 
 * 与 memo.types.ts 中的 MemoListItem 保持一致。
 * TODO: 后续考虑直接从 types 导入，避免重复定义。
 */
interface MemoListItem {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
  isArchived: boolean;
}

/**
 * 备忘录 Store 的状态接口
 */
interface MemoState {
  /** 备忘录列表 */
  memos: MemoListItem[];
  /** 当前选中的备忘录 ID */
  selectedMemoId: number | null;
  /** 是否正在加载数据 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /**
   * 加载备忘录列表
   */
  fetchMemos: () => Promise<void>;
  /**
   * 创建新备忘录
   * @param title - 备忘录标题
   * @param content - 备忘录内容（可选）
   */
  createMemo: (title: string, content?: string) => Promise<void>;
  /**
   * 更新备忘录
   * @param id - 备忘录 ID
   * @param updates - 要更新的字段
   */
  updateMemo: (id: number, updates: Partial<MemoListItem>) => Promise<void>;
  /**
   * 删除备忘录
   * @param id - 备忘录 ID
   */
  deleteMemo: (id: number) => Promise<void>;
  /**
   * 选择备忘录
   * @param id - 备忘录 ID，null 表示取消选择
   */
  selectMemo: (id: number | null) => void;
  /**
   * 切换置顶状态
   * @param id - 备忘录 ID
   */
  togglePin: (id: number) => Promise<void>;
  /**
   * 切换归档状态
   * @param id - 备忘录 ID
   */
  toggleArchive: (id: number) => Promise<void>;
}

/**
 * 备忘录状态管理 Store
 * 
 * 使用 Zustand 管理的全局备忘录状态。
 * 
 * @example
 * ```typescript
 * const {
 *   memos,
 *   selectedMemoId,
 *   isLoading,
 *   error,
 *   fetchMemos,
 *   createMemo,
 *   updateMemo,
 *   deleteMemo,
 *   selectMemo,
 *   togglePin,
 *   toggleArchive
 * } = useMemoStore();
 * ```
 */
export const useMemoStore = create<MemoState>((set, get) => ({
  // 初始状态
  memos: [],
  selectedMemoId: null,
  isLoading: false,
  error: null,

  /**
   * 加载备忘录列表
   * 
   * TODO: 实现 API 调用
   * - 调用 GET /api/v1/memos 获取备忘录列表
   * - 更新 memos 状态
   * - 处理错误情况
   */
  fetchMemos: async () => {
    set({ isLoading: true, error: null });
    try {
      // TODO: 调用 API
      // const response = await request.get('/memos');
      // set({ memos: response.data, isLoading: false });
      
      // 骨架阶段：模拟空列表
      set({ memos: [], isLoading: false });
    } catch (error) {
      set({ error: "加载备忘录失败", isLoading: false });
    }
  },

  /**
   * 创建新备忘录
   * 
   * TODO: 实现 API 调用
   * - 调用 POST /api/v1/memos 创建备忘录
   * - 新备忘录添加到列表顶部
   * 
   * @param title - 备忘录标题
   * @param content - 备忘录内容（可选）
   */
  createMemo: async (title, content) => {
    set({ isLoading: true, error: null });
    try {
      // TODO: 调用 API
      // const response = await request.post('/memos', { title, content });
      // const newMemo = response.data;
      // set(state => ({ memos: [newMemo, ...state.memos], isLoading: false }));
      
      // 骨架阶段：模拟成功
      console.log("创建备忘录:", { title, content });
      set({ isLoading: false });
    } catch (error) {
      set({ error: "创建备忘录失败", isLoading: false });
    }
  },

  /**
   * 更新备忘录
   * 
   * TODO: 实现 API 调用
   * - 调用 PATCH /api/v1/memos/:id 更新备忘录
   * - 更新列表中对应备忘录的信息
   * 
   * @param id - 备忘录 ID
   * @param updates - 要更新的字段（title, content, isPinned, isArchived）
   */
  updateMemo: async (id, updates) => {
    try {
      // TODO: 调用 API
      // await request.patch(`/memos/${id}`, updates);
      // 
      // 更新本地状态
      set((state) => ({
        memos: state.memos.map((memo) =>
          memo.id === id ? { ...memo, ...updates } : memo
        ),
      }));
    } catch (error) {
      set({ error: "更新备忘录失败" });
    }
  },

  /**
   * 删除备忘录
   * 
   * TODO: 实现 API 调用
   * - 调用 DELETE /api/v1/memos/:id 删除备忘录
   * - 从列表中移除
   * 
   * @param id - 备忘录 ID
   */
  deleteMemo: async (id) => {
    try {
      // TODO: 调用 API
      // await request.delete(`/memos/${id}`);
      // 
      // 更新本地状态
      set((state) => ({
        memos: state.memos.filter((memo) => memo.id !== id),
        selectedMemoId: state.selectedMemoId === id ? null : state.selectedMemoId,
      }));
    } catch (error) {
      set({ error: "删除备忘录失败" });
    }
  },

  /**
   * 选择备忘录
   * 
   * 设置当前选中的备忘录 ID，用于详情视图显示。
   * 
   * @param id - 备忘录 ID，null 表示取消选择
   */
  selectMemo: (id) => {
    set({ selectedMemoId: id });
  },

  /**
   * 切换置顶状态
   * 
   * TODO: 实现 API 调用
   * 
   * @param id - 备忘录 ID
   */
  togglePin: async (id) => {
    const memo = get().memos.find((m) => m.id === id);
    if (memo) {
      // 乐观更新：先更新本地状态
      set((state) => ({
        memos: state.memos.map((m) =>
          m.id === id ? { ...m, isPinned: !m.isPinned } : m
        ),
      }));
      
      // TODO: 调用 API
      // await request.patch(`/memos/${id}`, { isPinned: !memo.isPinned });
    }
  },

  /**
   * 切换归档状态
   * 
   * TODO: 实现 API 调用
   * 
   * @param id - 备忘录 ID
   */
  toggleArchive: async (id) => {
    const memo = get().memos.find((m) => m.id === id);
    if (memo) {
      // 乐观更新：先更新本地状态
      set((state) => ({
        memos: state.memos.map((m) =>
          m.id === id ? { ...m, isArchived: !m.isArchived } : m
        ),
      }));
      
      // TODO: 调用 API
      // await request.patch(`/memos/${id}`, { isArchived: !memo.isArchived });
    }
  },
}));