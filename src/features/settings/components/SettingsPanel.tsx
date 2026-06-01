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
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-2 py-2">
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex h-14 items-center gap-2 border-b border-border bg-muted px-5">
          <Globe2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{t("settings.language.title")}</h2>
        </div>

        <div className="p-6">
          <label className="flex items-center justify-between gap-6 border-b border-border pb-5">
            <span>
              <span className="block text-sm font-medium text-foreground">{t("settings.language.label")}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {t("settings.language.zh")} / {t("settings.language.ja")}
              </span>
            </span>
            <select
              value={language}
              onChange={(event) => {
                setLanguage(event.target.value as Language);
                setMessage(t("settings.language.saved"));
                setError(null);
              }}
              className="h-9 min-w-40 rounded-sm border border-input bg-background px-3 text-sm outline-none transition-all duration-150 focus:border-ring focus:ring-[3px] focus:ring-primary/10"
            >
              <option value="zh-CN">{t("settings.language.zh")}</option>
              <option value="ja-JP">{t("settings.language.ja")}</option>
            </select>
          </label>

          <div className="flex items-center justify-between gap-6 pt-5">
            <span>
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Type className="h-4 w-4 text-muted-foreground" />
                {t("settings.language.font")}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">{t("settings.language.fontHint")}</span>
            </span>
            <span className="rounded-md bg-muted px-3 py-2 text-sm font-medium text-foreground">
              {t("settings.language.fontName")}
            </span>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex h-14 items-center gap-2 border-b border-border bg-muted px-5">
          <Keyboard className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{t("settings.shortcuts.title")}</h2>
        </div>

        <div className="p-6">
          <label className="flex items-center justify-between gap-6 border-b border-border pb-5">
            <span>
              <span className="block text-sm font-medium text-foreground">{t("settings.shortcuts.showMain")}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{t("settings.shortcuts.showMainHint")}</span>
            </span>
            <input
              value={showMain}
              onChange={(event) => setShowMain(event.target.value)}
              className="h-9 min-w-40 rounded-sm border border-input bg-background px-3 text-sm outline-none transition-all duration-150 focus:border-ring focus:ring-[3px] focus:ring-primary/10"
              placeholder="Ctrl+Alt+M"
            />
          </label>

          <label className="flex items-center justify-between gap-6 border-b border-border py-5">
            <span>
              <span className="block text-sm font-medium text-foreground">{t("settings.shortcuts.quickMemo")}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{t("settings.shortcuts.quickMemoHint")}</span>
            </span>
            <input
              value={quickMemo}
              onChange={(event) => setQuickMemo(event.target.value)}
              className="h-9 min-w-40 rounded-sm border border-input bg-background px-3 text-sm outline-none transition-all duration-150 focus:border-ring focus:ring-[3px] focus:ring-primary/10"
              placeholder="Ctrl+Alt+N"
            />
          </label>

          <div className="flex items-center justify-between gap-3 pt-5">
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
