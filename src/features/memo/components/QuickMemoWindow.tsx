import { useEffect, useMemo, useRef, useState } from "react";
import { emit } from "@tauri-apps/api/event";
import { CheckCircle2, LoaderCircle, Maximize2, Save, X } from "lucide-react";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, Textarea } from "@/components/ui";
import { hideQuickMemoWindow } from "@/desktop/shortcut/shortcutManager";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/utils/cn";
import { createMemo, listMemoGroups } from "../api/memoApi";
import type { MemoGroup } from "../types/memo.types";
import { MemoGroupIcon } from "./MemoGroupIcon";

function extractTitle(content: string): string {
  const firstLine = content.split("\n").find((line) => line.trim().length > 0);
  return firstLine?.trim().slice(0, 60) || "";
}

export function QuickMemoWindow() {
  const { t } = useI18n();
  const [groups, setGroups] = useState<MemoGroup[]>([]);
  const [groupId, setGroupId] = useState<number | undefined>();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedMessageVisible, setSavedMessageVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const savedMessageTimerRef = useRef<number | null>(null);

  const canSave = useMemo(() => content.trim().length > 0 && !isSaving, [content, isSaving]);
  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === groupId),
    [groupId, groups]
  );

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

  useEffect(() => {
    return () => {
      if (savedMessageTimerRef.current) {
        window.clearTimeout(savedMessageTimerRef.current);
      }
    };
  }, []);

  const close = async () => {
    await hideQuickMemoWindow();
  };

  const showSavedMessage = () => {
    setSavedMessageVisible(true);
    if (savedMessageTimerRef.current) {
      window.clearTimeout(savedMessageTimerRef.current);
    }
    savedMessageTimerRef.current = window.setTimeout(() => {
      setSavedMessageVisible(false);
      savedMessageTimerRef.current = null;
    }, 1200);
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
      showSavedMessage();
      await close();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("quickMemo.error.create"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-card px-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Maximize2 className="h-3.5 w-3.5" />
          </div>
          <div className="truncate text-sm font-semibold">{t("quickMemo.title")}</div>
        </div>
        <Button size="icon" variant="ghost" onClick={close} title={t("quickMemo.close")}>
          <X className="h-4 w-4" />
        </Button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col bg-muted/30 p-3">
        {groups.length > 0 && (
          <Select
            value={groupId ? String(groupId) : undefined}
            onValueChange={(value) => setGroupId(Number(value))}
          >
            <SelectTrigger className="mb-2 h-8 w-full bg-card">
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <MemoGroupIcon group={selectedGroup} />
                <span className="min-w-0 truncate">{selectedGroup?.name}</span>
              </span>
            </SelectTrigger>
            <SelectContent>
              {groups.map((group) => (
                <SelectItem key={group.id} value={String(group.id)} hideIndicator>
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MemoGroupIcon group={group} />
                    <span className="min-w-0 truncate">{group.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Textarea
          ref={editorRef}
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            setError(null);
            setSavedMessageVisible(false);
          }}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && (event.key === "Enter" || event.key.toLowerCase() === "s")) {
              event.preventDefault();
              void save();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              void close();
            }
          }}
          className="min-h-0 flex-1 resize-none rounded-md border-border bg-card p-3 leading-6 shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20"
          placeholder={t("quickMemo.placeholder")}
        />

        <div className="mt-2 flex h-9 shrink-0 items-center justify-between gap-3">
          <div className="min-w-0 text-xs">
            {error ? (
              <span className="text-destructive">{error}</span>
            ) : savedMessageVisible ? (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t("quickMemo.saved")}
              </span>
            ) : (
              <span className={cn("text-muted-foreground", content.trim() && "text-foreground")}>
                {t("quickMemo.count", { count: String(content.length) })}
              </span>
            )}
          </div>
          <Button onClick={() => void save()} disabled={!canSave} className="shrink-0">
            {isSaving ? <LoaderCircle className="animate-spin" /> : <Save />}
            {t("quickMemo.create")}
          </Button>
        </div>
      </main>
    </div>
  );
}
