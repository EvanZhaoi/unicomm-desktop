import type { Memo } from "../types/memo.types";

type MemoDraftGuard = () => boolean | Promise<boolean>;

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
  if (!activeGuard) {
    return true;
  }

  return activeGuard();
}

export function saveMemoRecoveryDraft(memo: Memo) {
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
