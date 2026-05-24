import { invoke } from "@/native/api/invoke";

export interface ShortcutSettings {
  showMain: string;
  quickMemo: string;
}

export function configureGlobalShortcuts(shortcuts: ShortcutSettings): Promise<void> {
  return invoke("configure_global_shortcuts", {
    mainShortcut: shortcuts.showMain,
    quickMemoShortcut: shortcuts.quickMemo,
  });
}

export function hideQuickMemoWindow(): Promise<void> {
  return invoke("hide_quick_memo");
}
