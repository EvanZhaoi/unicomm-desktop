import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  Archive,
  FileText,
  Folder,
  Inbox,
  Plus,
  Save,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/utils/cn";
import { useMemoStore } from "../store/memoStore";
import type { Memo } from "../types/memo.types";

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
    deleteSelectedMemo,
    selectMemo,
    toggleTop,
    toggleFavorite,
    toggleArchive,
  } = useMemoStore();

  const selectedMemo = useMemo(
    () => memos.find((memo) => memo.id === selectedMemoId) ?? null,
    [memos, selectedMemoId]
  );
  const [draft, setDraft] = useState<Memo | null>(null);

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
    <div className="grid h-[calc(100vh-5.5rem)] grid-cols-[220px_320px_minmax(0,1fr)] overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <aside className="min-h-0 border-r border-border bg-card">
        <div className="flex h-14 items-center justify-between border-b border-border px-3">
          <div>
            <div className="text-sm font-semibold text-foreground">{t("memo.title")}</div>
            <div className="text-[11px] text-muted-foreground">{t("memo.count", { count: memos.length })}</div>
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={createMemo} disabled={isSaving} title={t("memo.new")}>
            <Plus />
          </Button>
        </div>
        <nav className="space-y-1 p-2">
          <button
            className={cn(
              "flex h-10 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-muted-foreground transition-all duration-150 hover:bg-accent hover:text-foreground",
              activeGroupId === null ? "bg-accent text-accent-foreground" : "hover:bg-accent"
            )}
            onClick={() => chooseGroup(null)}
          >
            <FileText className="h-4 w-4" />
            <span className="flex-1 truncate">{t("memo.all")}</span>
            <span className="text-xs text-muted-foreground">{memos.length}</span>
          </button>
          <div className="pt-3">
            <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("memo.groups")}
            </div>
          </div>
          <div className="space-y-1">
            {groups.map((group) => (
              <button
                key={group.id}
                className={cn(
                  "flex h-10 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-muted-foreground transition-all duration-150 hover:bg-accent hover:text-foreground",
                  activeGroupId === group.id ? "bg-accent text-accent-foreground" : "hover:bg-accent"
                )}
                onClick={() => chooseGroup(group.id)}
              >
                <Folder className="h-4 w-4" style={{ color: group.color }} />
                <span className="flex-1 truncate">{group.name}</span>
                <span className="text-xs text-muted-foreground">{group.memoCount}</span>
              </button>
            ))}
          </div>
        </nav>
      </aside>

      <section className="min-h-0 border-r border-border bg-card">
        <div className="flex h-14 items-center gap-2 border-b border-border px-3">
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
          <Button size="icon" variant="outline" className="h-9 w-9" onClick={search} title={t("memo.search")}>
            <Search />
          </Button>
        </div>
        <div className="h-[calc(100%-3.5rem)] overflow-auto">
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
                  <span className="rounded-sm bg-muted px-1.5 py-0.5">{t(memoStatusKey(memo.status))}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <main className="flex min-w-0 flex-col bg-background">
        {draft ? (
          <>
            <div className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" className={cn("h-8 w-8", draft.isTop && "bg-primary/10 text-primary")} onClick={() => toggleTop(draft.id)} title={t("memo.action.pin")}>
                  <FileText className={cn(draft.isTop && "text-primary")} />
                </Button>
                <Button size="icon" variant="ghost" className={cn("h-8 w-8", draft.isFavorite && "bg-primary/10 text-primary")} onClick={() => toggleFavorite(draft.id)} title={t("memo.action.favorite")}>
                  <Star className={cn(draft.isFavorite && "fill-primary text-primary")} />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleArchive(draft.id)} title={t("memo.action.archive")}>
                  <Archive />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {error && <span className="text-xs text-destructive">{error}</span>}
                <Button variant="outline" onClick={deleteSelectedMemo} disabled={isSaving}>
                  <Trash2 />
                  {t("memo.action.delete")}
                </Button>
                <Button onClick={saveDraft} disabled={isSaving}>
                  <Save />
                  {t("memo.action.save")}
                </Button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-4 p-6">
              <input
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                className="w-full border-0 bg-transparent text-xl font-semibold tracking-normal text-foreground outline-none placeholder:text-muted-foreground"
                placeholder={t("memo.title.placeholder")}
              />
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <select
                  value={draft.groupId}
                  onChange={(event) => setDraft({ ...draft, groupId: Number(event.target.value) })}
                  className="h-8 rounded-sm border border-input bg-card px-2 text-xs outline-none transition-all duration-150 hover:border-ring focus:border-ring focus:ring-[3px] focus:ring-primary/10"
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
                  className="h-8 rounded-sm border border-input bg-card px-2 text-xs outline-none transition-all duration-150 hover:border-ring focus:border-ring focus:ring-[3px] focus:ring-primary/10"
                >
                  <option value="normal">{t("memo.status.normal")}</option>
                  <option value="todo">{t("memo.status.todo")}</option>
                  <option value="done">{t("memo.status.done")}</option>
                </select>
                <span className="text-xs text-muted-foreground">
                  {t("memo.updatedAt", { time: formatDate(draft.updateTime) })}
                </span>
              </div>
              <textarea
                value={draft.content}
                onChange={(event) => setDraft({ ...draft, content: event.target.value })}
                className="min-h-0 flex-1 resize-none rounded-md border border-input bg-background p-4 font-mono text-sm leading-7 text-foreground outline-none transition-all duration-150 placeholder:text-muted-foreground focus:border-ring focus:ring-[3px] focus:ring-primary/10"
                placeholder={t("memo.editor.placeholder")}
              />
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
