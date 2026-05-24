import { useEffect, useState } from "react";
import { Keyboard, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui";
import { configureGlobalShortcuts } from "@/desktop/shortcut/shortcutManager";
import { useSettingStore } from "@/stores/settingStore";

const DEFAULT_SHORTCUTS = {
  showMain: "Ctrl+Alt+M",
  quickMemo: "Ctrl+Alt+N",
};

function normalizeShortcut(value: string): string {
  return value
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("+");
}

export function SettingsPanel() {
  const { shortcuts, setShortcuts } = useSettingStore();
  const [showMain, setShowMain] = useState(shortcuts.showMain);
  const [quickMemo, setQuickMemo] = useState(shortcuts.quickMemo);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setShowMain(shortcuts.showMain);
    setQuickMemo(shortcuts.quickMemo);
  }, [shortcuts.quickMemo, shortcuts.showMain]);

  const save = async () => {
    const next = {
      showMain: normalizeShortcut(showMain),
      quickMemo: normalizeShortcut(quickMemo),
    };

    setMessage(null);
    setError(null);

    if (!next.showMain || !next.quickMemo) {
      setError("快捷键不能为空");
      return;
    }

    if (next.showMain.toLowerCase() === next.quickMemo.toLowerCase()) {
      setError("两个快捷键不能相同");
      return;
    }

    setIsSaving(true);
    try {
      await configureGlobalShortcuts(next);
      setShortcuts(next);
      setShowMain(next.showMain);
      setQuickMemo(next.quickMemo);
      setMessage("快捷键已更新");
    } catch (err) {
      setError(err instanceof Error ? err.message : "快捷键更新失败");
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    setShowMain(DEFAULT_SHORTCUTS.showMain);
    setQuickMemo(DEFAULT_SHORTCUTS.quickMemo);
    setMessage(null);
    setError(null);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <section className="border border-border bg-background">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <Keyboard className="h-4 w-4" />
          <h2 className="text-sm font-semibold">快捷键</h2>
        </div>

        <div className="space-y-5 p-5">
          <label className="grid gap-2">
            <span className="text-sm font-medium">唤出主界面</span>
            <input
              value={showMain}
              onChange={(event) => setShowMain(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
              placeholder="Ctrl+Alt+M"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium">唤出简易 Memo</span>
            <input
              value={quickMemo}
              onChange={(event) => setQuickMemo(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
              placeholder="Ctrl+Alt+N"
            />
          </label>

          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <div className="min-h-5 text-sm">
              {error && <span className="text-destructive">{error}</span>}
              {message && <span className="text-muted-foreground">{message}</span>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={reset} disabled={isSaving}>
                <RotateCcw />
                恢复默认
              </Button>
              <Button onClick={save} disabled={isSaving}>
                <Save />
                保存
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
