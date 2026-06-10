import type { Memo } from "../types/memo.types";

type MemoDraftGuard = () => boolean | Promise<boolean>;

/*
 * MemoDraftGuard 是跨组件的“离开前保存”协调器。
 *
 * 背景：
 * - 用户在编辑 Memo 时，可能点击设置、切换视图、打开通知跳转、从系统通知跳到某个 Memo。
 * - 这些动作不属于 MemoWorkspace 内部按钮，但都会导致当前编辑对象被替换。
 * - 如果每个入口都自己判断草稿状态，后续很容易漏掉一个跳转入口。
 *
 * 约定：
 * - MemoWorkspace 挂载时注册 activeGuard。
 * - 所有可能离开编辑上下文的入口统一调用 saveMemoDraftBeforeLeave()。
 * - 如果保存失败但业务允许继续跳转，MemoWorkspace 会把草稿放入 recoveryDrafts，避免用户输入直接丢失。
 */
let activeGuard: MemoDraftGuard | null = null;
const recoveryDrafts = new Map<number, Memo>();

export function registerMemoDraftGuard(guard: MemoDraftGuard) {
  activeGuard = guard;

  return () => {
    if (activeGuard === guard) {
      activeGuard = null;
    }
  };
}

export async function saveMemoDraftBeforeLeave(): Promise<boolean> {
  // 没有活跃编辑器时直接放行，避免全局导航依赖 MemoWorkspace 必须存在。
  if (!activeGuard) {
    return true;
  }

  return activeGuard();
}

export function saveMemoRecoveryDraft(memo: Memo) {
  // 仅保存在内存中。应用崩溃恢复后续可以接入 IndexedDB 或 Tauri 本地存储。
  recoveryDrafts.set(memo.id, { ...memo });
}

export function consumeMemoRecoveryDraft(id: number): Memo | null {
  const memo = recoveryDrafts.get(id) ?? null;
  recoveryDrafts.delete(id);
  return memo;
}

export function clearMemoRecoveryDraft(id: number) {
  recoveryDrafts.delete(id);
}
