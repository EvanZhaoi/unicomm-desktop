import { useEffect, useState } from "react";
import { Globe2, Keyboard, RotateCcw, Save, Type } from "lucide-react";
import { Button } from "@/components/ui";
import { configureGlobalShortcuts } from "@/desktop/shortcut/shortcutManager";
import { useI18n } from "@/i18n/useI18n";
import { useSettingStore } from "@/stores/settingStore";
import type { Language } from "@/i18n";

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
  const { shortcuts, language, setLanguage, setShortcuts } = useSettingStore();
  const { t } = useI18n();
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
      setError(t("settings.shortcuts.empty"));
      return;
    }

    if (next.showMain.toLowerCase() === next.quickMemo.toLowerCase()) {
      setError(t("settings.shortcuts.duplicate"));
      return;
    }

    setIsSaving(true);
    try {
      await configureGlobalShortcuts(next);
      setShortcuts(next);
      setShowMain(next.showMain);
      setQuickMemo(next.quickMemo);
      setMessage(t("settings.shortcuts.saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.shortcuts.failed"));
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
          <Globe2 className="h-4 w-4" />
          <h2 className="text-sm font-semibold">{t("settings.language.title")}</h2>
        </div>

        <div className="space-y-5 p-5">
          <label className="grid gap-2">
            <span className="text-sm font-medium">{t("settings.language.label")}</span>
            <select
              value={language}
              onChange={(event) => {
                setLanguage(event.target.value as Language);
                setMessage(t("settings.language.saved"));
                setError(null);
              }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="zh-CN">{t("settings.language.zh")}</option>
              <option value="ja-JP">{t("settings.language.ja")}</option>
            </select>
          </label>

          <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
            <Type className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t("settings.language.font")}</span>
            <span className="font-medium">{t("settings.language.fontName")}</span>
          </div>
        </div>
      </section>

      <section className="border border-border bg-background">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <Keyboard className="h-4 w-4" />
          <h2 className="text-sm font-semibold">{t("settings.shortcuts.title")}</h2>
        </div>

        <div className="space-y-5 p-5">
          <label className="grid gap-2">
            <span className="text-sm font-medium">{t("settings.shortcuts.showMain")}</span>
            <input
              value={showMain}
              onChange={(event) => setShowMain(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
              placeholder="Ctrl+Alt+M"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium">{t("settings.shortcuts.quickMemo")}</span>
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
                {t("settings.actions.reset")}
              </Button>
              <Button onClick={save} disabled={isSaving}>
                <Save />
                {t("settings.actions.save")}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
