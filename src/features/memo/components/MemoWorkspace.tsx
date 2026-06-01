import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  Archive,
  FileCode2,
  FileText,
  Inbox,
  Plus,
  Save,
  Search,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/utils/cn";
import { useMemoStore } from "../store/memoStore";
import type { Memo } from "../types/memo.types";

const MemoRichEditor = lazy(() => import("./MemoRichEditor"));

function formatDate(value: string): string {
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

function memoStatusKey(status: Memo["status"]) {
  return `memo.status.${status}` as const;
}

export function MemoWorkspace() {
  const { t } = useI18n();
  const {
    memos,
    groups,
    selectedMemoId,
    activeGroupId,
    keyword,
    isLoading,
    isSaving,
    error,
    fetchInitialData,
    fetchMemos,
    setKeyword,
    setActiveGroup,
    createMemo,
    updateSelectedMemo,
    selectMemo,
    toggleFavorite,
    toggleArchive,
  } = useMemoStore();

  const selectedMemo = useMemo(
    () => memos.find((memo) => memo.id === selectedMemoId) ?? null,
    [memos, selectedMemoId]
  );
  const [draft, setDraft] = useState<Memo | null>(null);
  const [editorMode, setEditorMode] = useState<"visual" | "markdown">("visual");

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    const unlisten = listen("memo-created", () => {
      fetchInitialData();
    });

    return () => {
      unlisten.then((dispose) => dispose());
    };
  }, [fetchInitialData]);

  useEffect(() => {
    setDraft(selectedMemo ? { ...selectedMemo } : null);
  }, [selectedMemo]);

  const saveDraft = async () => {
    if (!draft) {
      return;
    }
    await updateSelectedMemo({
      title: draft.title,
      content: draft.content,
      groupId: draft.groupId,
      status: draft.status,
    });
  };

  const chooseGroup = async (groupId: number | null) => {
    setActiveGroup(groupId);
    await fetchMemos();
  };

  const search = async () => {
    await fetchMemos();
  };

  return (
    <div className="grid h-full grid-cols-[320px_minmax(0,1fr)] overflow-hidden bg-background">
      <section className="min-h-0 border-r border-border bg-card">
        <div className="border-b border-border p-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  search();
                }
              }}
              className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-2 text-sm outline-none transition-all duration-150 focus:border-ring focus:ring-[3px] focus:ring-primary/10"
              placeholder={t("memo.search.placeholder")}
            />
          </div>
        </div>
        <button
          onClick={createMemo}
          disabled={isSaving}
          className="mx-4 my-3 flex w-[calc(100%-2rem)] items-center justify-center gap-1 rounded-md bg-primary px-3 py-2.5 text-[13px] font-medium text-primary-foreground shadow-sm transition-all duration-150 hover:-translate-y-px hover:shadow-md disabled:pointer-events-none disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {t("memo.new")}
        </button>
        <div className="px-4 pb-2">
          <select
            value={activeGroupId ?? ""}
            onChange={(event) => chooseGroup(event.target.value ? Number(event.target.value) : null)}
            className="h-8 w-full rounded-sm border border-input bg-background px-2 text-xs text-muted-foreground outline-none focus:border-ring focus:ring-[3px] focus:ring-primary/10"
          >
            <option value="">{t("memo.all")}</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
        <div className="h-[calc(100%-10.75rem)] overflow-auto">
          {isLoading ? (
            <EmptyMemoState icon={<Search className="h-5 w-5" />} title={t("memo.loading")} />
          ) : memos.length === 0 ? (
            <EmptyMemoState icon={<Inbox className="h-5 w-5" />} title={t("memo.empty")} />
          ) : (
            memos.map((memo) => (
              <button
                key={memo.id}
                className={cn(
                  "block w-full border-l-2 border-b border-l-transparent border-border p-4 text-left transition-colors duration-100 hover:bg-accent",
                  selectedMemoId === memo.id && "border-l-primary bg-accent"
                )}
                onClick={() => selectMemo(memo.id)}
              >
                <div className="flex items-center gap-2">
                  {memo.isTop && <span className="text-xs text-primary">📌</span>}
                  <div className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{memo.title}</div>
                  {memo.isFavorite && <Star className="h-3.5 w-3.5 fill-primary text-primary" />}
                </div>
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {memo.content || t("memo.noContent")}
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{formatDate(memo.updateTime)}</span>
                  <span className="inline-flex items-center gap-1">
                    <span className={cn("h-1.5 w-1.5 rounded-full", memo.status === "todo" ? "bg-yellow-500" : memo.status === "done" ? "bg-blue-500" : "bg-emerald-500")} />
                    {t(memoStatusKey(memo.status))}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <main className="flex min-w-0 flex-col bg-background">
        {draft ? (
          <>
            <div className="border-b border-border bg-card p-6">
              <input
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                className="w-full border-0 bg-transparent text-xl font-semibold tracking-normal text-foreground outline-none placeholder:text-muted-foreground"
                placeholder={t("memo.title.placeholder")}
              />
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <select
                  value={draft.groupId}
                  onChange={(event) => setDraft({ ...draft, groupId: Number(event.target.value) })}
                  className="rounded-sm border border-input bg-transparent px-2 py-1 outline-none transition-all duration-150 hover:border-ring focus:border-ring focus:ring-[3px] focus:ring-primary/10"
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                <select
                  value={draft.status}
                  onChange={(event) => setDraft({ ...draft, status: event.target.value as Memo["status"] })}
                  className="rounded-sm border border-input bg-transparent px-2 py-1 outline-none transition-all duration-150 hover:border-ring focus:border-ring focus:ring-[3px] focus:ring-primary/10"
                >
                  <option value="normal">{t("memo.status.normal")}</option>
                  <option value="todo">{t("memo.status.todo")}</option>
                  <option value="done">{t("memo.status.done")}</option>
                </select>
                <span>{t("memo.updatedAt", { time: formatDate(draft.updateTime) })}</span>
              </div>
              <div className="mt-4 flex justify-end">
                <div className="flex gap-0.5 rounded-sm bg-muted p-0.5">
                  <button
                    type="button"
                    onClick={() => setEditorMode("visual")}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-sm px-3 py-1.5 text-[11px] transition-colors hover:text-foreground",
                      editorMode === "visual" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                    )}
                  >
                    <FileText className="h-3 w-3" />
                    {t("memo.editor.visual")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode("markdown")}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-sm px-3 py-1.5 text-[11px] transition-colors hover:text-foreground",
                      editorMode === "markdown" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                    )}
                  >
                    <FileCode2 className="h-3 w-3" />
                    {t("memo.editor.markdown")}
                  </button>
                </div>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-6">
              {editorMode === "markdown" ? (
                <textarea
                  value={draft.content}
                  onChange={(event) => setDraft({ ...draft, content: event.target.value })}
                  className="h-full w-full resize-none rounded-md border border-input bg-background p-4 font-mono text-sm leading-7 text-foreground outline-none transition-all duration-150 placeholder:text-muted-foreground focus:border-ring focus:ring-[3px] focus:ring-primary/10"
                  placeholder={t("memo.editor.placeholder")}
                />
              ) : (
                <Suspense fallback={<EmptyMemoState icon={<FileText className="h-5 w-5" />} title={t("memo.loading")} />}>
                  <MemoRichEditor
                    key={`${draft.id}-${draft.updateTime}`}
                    value={draft.content}
                    placeholder={t("memo.editor.placeholder")}
                    onChange={(content) => setDraft({ ...draft, content })}
                  />
                </Suspense>
              )}
            </div>
            <div className="flex h-[52px] items-center justify-between border-t border-border bg-card px-4 py-2">
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{t("memo.editor.saved")}</span>
                {error && <span className="text-destructive">{error}</span>}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => toggleArchive(draft.id)} disabled={isSaving}>
                  <Archive />
                  {t("memo.action.archive")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleFavorite(draft.id)} disabled={isSaving}>
                  <Star className={cn(draft.isFavorite && "fill-primary text-primary")} />
                  {t("memo.action.favorite")}
                </Button>
                <Button size="sm" onClick={saveDraft} disabled={isSaving}>
                  <Save />
                  {t("memo.action.save")}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <EmptyMemoState icon={<FileText className="h-6 w-6" />} title={t("memo.selectOrCreate")} />
        )}
      </main>
    </div>
  );
}

function EmptyMemoState({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm">
          {icon}
        </div>
        <p className="text-sm font-medium text-foreground">{title}</p>
      </div>
    </div>
  );
}
