import { queryClient } from "@/core/query/queryClient";
import { memoQueryKeys } from "./memoQueryKeys";

/**
 * 根据实时事件失效 Memo 查询缓存。
 *
 * WebSocket 事件代表服务端数据已经变化。如果不先 invalidate，`fetchQuery`
 * 可能在 staleTime 内直接返回旧缓存，导致界面收到事件却看不到最新数据。
 */
export function invalidateMemoQueriesForRealtimeEvent(eventType: string, memoId?: number | null) {
  if (eventType.startsWith("group.")) {
    void queryClient.invalidateQueries({ queryKey: memoQueryKeys.groups() });
    void queryClient.invalidateQueries({ queryKey: memoQueryKeys.lists() });
    return;
  }

  if (eventType.startsWith("memo.")) {
    void queryClient.invalidateQueries({ queryKey: memoQueryKeys.lists() });
    if (memoId) {
      void queryClient.invalidateQueries({ queryKey: memoQueryKeys.detail(memoId) });
    }
  }
}
