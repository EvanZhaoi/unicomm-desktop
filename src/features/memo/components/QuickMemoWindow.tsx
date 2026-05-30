import { useEffect, useMemo, useRef, useState } from "react";
import { emit } from "@tauri-apps/api/event";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui";
import { hideQuickMemoWindow } from "@/desktop/shortcut/shortcutManager";
import { useI18n } from "@/i18n/useI18n";
import { createMemo, listMemoGroups } from "../api/memoApi";
import type { MemoGroup } from "../types/memo.types";

function extractTitle(content: string): string {
  const firstLine = content.split("\n").find((line) => line.trim().length > 0);
  return firstLine?.trim().slice(0, 60) || "无标题";
}

export function QuickMemoWindow() {
  const { t } = useI18n();
  const [groups, setGroups] = useState<MemoGroup[]>([]);
  const [groupId, setGroupId] = useState<number | undefined>();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const canSave = useMemo(() => content.trim().length > 0 && !isSaving, [content, isSaving]);

  useEffect(() => {
    listMemoGroups()
      .then((items) => {
        setGroups(items);
        setGroupId(items[0]?.id);
      })
      .catch(() => {
        setGroups([]);
      });
  }, []);

  useEffect(() => {
    editorRef.current?.focus();
  }, []);

  const close = async () => {
    await hideQuickMemoWindow();
  };

  const save = async () => {
    if (!canSave) {
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const memo = await createMemo({
        title: extractTitle(content),
        content,
        groupId,
        status: "normal",
      });
      await emit("memo-created", memo);
      setContent("");
      await close();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("quickMemo.error.create"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-12 items-center justify-between border-b border-border px-3">
        <div className="text-sm font-semibold">{t("quickMemo.title")}</div>
        <Button size="icon" variant="ghost" onClick={close} title={t("quickMemo.close")}>
          <X />
        </Button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        {groups.length > 0 && (
          <select
            value={groupId}
            onChange={(event) => setGroupId(Number(event.target.value))}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
          >
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        )}

        <textarea
          ref={editorRef}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              event.preventDefault();
              save();
            }
          }}
          className="min-h-0 flex-1 resize-none rounded-md border border-input bg-background p-3 text-sm leading-6 outline-none focus:ring-1 focus:ring-ring"
          placeholder={t("quickMemo.placeholder")}
        />

        <div className="flex items-center justify-between gap-3">
          <div className="min-h-5 text-xs text-destructive">{error}</div>
          <Button onClick={save} disabled={!canSave}>
            <Save />
            {t("quickMemo.create")}
          </Button>
        </div>
      </main>
    </div>
  );
}
