import type { Memo } from "../types/memo.types";

export function formatMemoDate(value: string): string {
  if (!value) {
    return "";
  }
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function memoStatusKey(status: Memo["status"]) {
  return `memo.status.${status}` as const;
}
