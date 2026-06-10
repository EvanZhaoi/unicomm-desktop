import { QueryClient } from "@tanstack/react-query";

/**
 * 应用级 TanStack Query Client。
 *
 * <p>当前采用“TanStack Query 管服务端缓存 + Zustand 管 UI 状态”的组合：
 * QueryClient 负责请求去重、短期缓存和失效刷新；Memo store 继续负责选中项、
 * 编辑草稿、保存状态、右键菜单等纯前端交互状态。</p>
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
