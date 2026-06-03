import { useEffect, useState } from "react";
import { Globe2, Keyboard, RotateCcw, Save, Type } from "lucide-react";
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
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
    <div className="mx-auto flex max-w-4xl flex-col gap-4 px-2 py-2">
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex h-12 items-center gap-2 border-b border-border bg-muted px-4">
          <Globe2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{t("settings.language.title")}</h2>
        </div>

        <div className="p-4">
          <label className="flex items-center justify-between gap-4 border-b border-border pb-4">
            <span>
              <span className="block text-sm font-medium text-foreground">{t("settings.language.label")}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {t("settings.language.zh")} / {t("settings.language.ja")}
              </span>
            </span>
            <Select
              value={language}
              onValueChange={(value) => {
                setLanguage(value as Language);
                setMessage(t("settings.language.saved"));
                setError(null);
              }}
            >
              <SelectTrigger className="min-w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh-CN">{t("settings.language.zh")}</SelectItem>
                <SelectItem value="ja-JP">{t("settings.language.ja")}</SelectItem>
              </SelectContent>
            </Select>
          </label>

          <div className="flex items-center justify-between gap-4 pt-4">
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
        <div className="flex h-12 items-center gap-2 border-b border-border bg-muted px-4">
          <Keyboard className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{t("settings.shortcuts.title")}</h2>
        </div>

        <div className="p-4">
          <label className="flex items-center justify-between gap-4 border-b border-border pb-4">
            <span>
              <span className="block text-sm font-medium text-foreground">{t("settings.shortcuts.showMain")}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{t("settings.shortcuts.showMainHint")}</span>
            </span>
            <Input
              value={showMain}
              onChange={(event) => setShowMain(event.target.value)}
              className="min-w-40"
              placeholder="Ctrl+Alt+M"
            />
          </label>

          <label className="flex items-center justify-between gap-4 border-b border-border py-4">
            <span>
              <span className="block text-sm font-medium text-foreground">{t("settings.shortcuts.quickMemo")}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{t("settings.shortcuts.quickMemoHint")}</span>
            </span>
            <Input
              value={quickMemo}
              onChange={(event) => setQuickMemo(event.target.value)}
              className="min-w-40"
              placeholder="Ctrl+Alt+N"
            />
          </label>

          <div className="flex items-center justify-between gap-3 pt-4">
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
