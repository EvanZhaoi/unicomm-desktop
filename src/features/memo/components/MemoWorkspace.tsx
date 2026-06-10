import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  AlertCircle,
  CheckCircle2,
  Columns2,
  Eye,
  FileCode2,
  FileText,
  Inbox,
  LoaderCircle,
  Pencil,
  Pin,
  Plus,
  Save,
  Search,
  Star,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  Button,
  Input,
  RemoteMultiSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
  type RemoteSelectOption,
} from "@/components/ui";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/utils/cn";
import { searchMembers } from "../api/memoApi";
import {
  clearMemoRecoveryDraft,
  consumeMemoRecoveryDraft,
  registerMemoDraftGuard,
  saveMemoRecoveryDraft,
} from "../services/memoDraftGuard";
import { useMemoStore } from "../store/memoStore";
import type { Memo, MemoGroup } from "../types/memo.types";
import { MemoGroupIcon } from "./MemoGroupIcon";

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

const memoStatusOptions: Array<{ value: Memo["status"]; colorClassName: string }> = [
  { value: "normal", colorClassName: "bg-emerald-500" },
  { value: "todo", colorClassName: "bg-yellow-500" },
  { value: "done", colorClassName: "bg-blue-500" },
];

type DraftSaveStatus = "saved" | "dirty" | "saving" | "error";

export function MemoWorkspace() {
  const { t } = useI18n();
  const {
    memos,
    groups,
    selectedMemoId,
    activeScope,
    keyword,
    isLoading,
    isLoadingMore,
    hasMoreMemos,
    isSaving,
    error,
    fetchInitialData,
    fetchMemos,
    fetchNextMemos,
    fetchGroups,
    fetchMemoDetail,
    setKeyword,
    createMemo,
    updateSelectedMemo,
    deleteSelectedMemo,
    deleteMemoById,
    selectMemo,
    toggleTop,
    toggleFavorite,
  } = useMemoStore();

  const selectedMemo = useMemo(
    () => memos.find((memo) => memo.id === selectedMemoId) ?? null,
    [memos, selectedMemoId]
  );
  const [draft, setDraft] = useState<Memo | null>(null);
  const [editorMode, setEditorMode] = useState<"visual" | "markdown" | "split">("visual");
  const [markdownDraft, setMarkdownDraft] = useState("");
  const [markdownPreviewContent, setMarkdownPreviewContent] = useState("");
  const [contextMenu, setContextMenu] = useState<{ memo: Memo; x: number; y: number } | null>(null);
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  const [draftSaveStatus, setDraftSaveStatus] = useState<DraftSaveStatus>("saved");
  const [detailReadyMemoId, setDetailReadyMemoId] = useState<number | null>(null);
  const previewSyncTimerRef = useRef<number | null>(null);
  const lastDraftMemoIdRef = useRef<number | null>(null);
  const currentPermission = draft?.currentUserPermission ?? "view";
  const isOwner = currentPermission === "owner" || draft?.isOwner === true;
  const canEdit = isOwner || currentPermission === "edit";
  const canManage = isOwner;
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    const unlisten = listen("memo-created", () => {
      void fetchGroups();
      void fetchMemos();
    });

    return () => {
      unlisten.then((dispose) => dispose());
    };
  }, [fetchGroups, fetchMemos]);

  useEffect(() => {
    if (lastDraftMemoIdRef.current === selectedMemoId) {
      return;
    }

    lastDraftMemoIdRef.current = selectedMemoId;
    const recoveryDraft = selectedMemoId ? consumeMemoRecoveryDraft(selectedMemoId) : null;
    setIsDraftDirty(Boolean(recoveryDraft));
    setDraftSaveStatus(recoveryDraft ? "error" : "saved");
    setDetailReadyMemoId(null);
    const nextDraft = recoveryDraft ?? (selectedMemo ? { ...selectedMemo } : null);
    setDraft(nextDraft);
    setMarkdownDraft(nextDraft?.content ?? "");
    setMarkdownPreviewContent(nextDraft?.content ?? "");
  }, [selectedMemo, selectedMemoId]);

  useEffect(() => {
    if (selectedMemoId) {
      void fetchMemoDetail(selectedMemoId).then(() => setDetailReadyMemoId(selectedMemoId));
    }
  }, [fetchMemoDetail, selectedMemoId]);

  useEffect(() => {
    if (!selectedMemo || isDraftDirty || lastDraftMemoIdRef.current !== selectedMemo.id) {
      return;
    }

    setDraft({ ...selectedMemo });
    setMarkdownDraft(selectedMemo.content ?? "");
    setMarkdownPreviewContent(selectedMemo.content ?? "");
  }, [isDraftDirty, selectedMemo]);

  useEffect(() => {
    return () => {
      if (previewSyncTimerRef.current) {
        window.clearTimeout(previewSyncTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const closeContextMenu = () => setContextMenu(null);
    window.addEventListener("click", closeContextMenu);
    window.addEventListener("resize", closeContextMenu);
    window.addEventListener("scroll", closeContextMenu, true);
    return () => {
      window.removeEventListener("click", closeContextMenu);
      window.removeEventListener("resize", closeContextMenu);
      window.removeEventListener("scroll", closeContextMenu, true);
    };
  }, []);

  useEffect(() => {
    if (editorMode === "visual" && draft) {
      setMarkdownPreviewContent(draft.content);
    }
  }, [draft, editorMode]);

  const updateDraftContent = (content: string) => {
    setIsDraftDirty(true);
    setDraftSaveStatus("dirty");
    setDraft((current) => (current ? { ...current, content } : current));
  };

  const updateContentFromVisualEditor = (content: string) => {
    updateDraftContent(content);
    setMarkdownDraft(content);
    setMarkdownPreviewContent(content);
  };

  const updateContentFromMarkdownSource = (content: string) => {
    setMarkdownDraft(content);
    updateDraftContent(content);

    // 双栏模式里源码输入可能是临时的不完整 Markdown，延迟同步能避免每个字符都重建左侧预览。
    if (previewSyncTimerRef.current) {
      window.clearTimeout(previewSyncTimerRef.current);
    }
    previewSyncTimerRef.current = window.setTimeout(() => {
      previewSyncTimerRef.current = null;
      setMarkdownPreviewContent(content);
    }, 400);
  };

  const changeEditorMode = async (nextMode: typeof editorMode) => {
    if (nextMode !== editorMode) {
      await saveDraft({ allowLeaveOnError: true });
    }

    setEditorMode(nextMode);
    if (nextMode !== "markdown") {
      if (previewSyncTimerRef.current) {
        window.clearTimeout(previewSyncTimerRef.current);
        previewSyncTimerRef.current = null;
      }
      setMarkdownPreviewContent(draft?.content ?? markdownDraft);
    }
  };

  const saveDraft = useCallback(async (options?: { allowLeaveOnError?: boolean }): Promise<boolean> => {
    if (!draft || !canEdit || !isDraftDirty) {
      return true;
    }

    setDraftSaveStatus("saving");
    try {
      await updateSelectedMemo({
        title: draft.title,
        content: draft.content,
        groupId: canManage ? draft.groupId : undefined,
        status: draft.status,
        relatedUsers: canManage && detailReadyMemoId === draft.id
          ? draft.relatedUsers.map((user) => ({
              username: user.username,
              permission: user.permission,
            }))
          : undefined,
      });
      setIsDraftDirty(false);
      setDraftSaveStatus("saved");
      clearMemoRecoveryDraft(draft.id);
      return true;
    } catch {
      saveMemoRecoveryDraft(draft);
      setDraftSaveStatus("error");
      return Boolean(options?.allowLeaveOnError);
    }
  }, [canEdit, canManage, detailReadyMemoId, draft, isDraftDirty, updateSelectedMemo]);

  useEffect(() => registerMemoDraftGuard(() => saveDraft({ allowLeaveOnError: true })), [saveDraft]);

  useEffect(() => {
    const saveWithShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveDraft();
      }
    };

    window.addEventListener("keydown", saveWithShortcut);
    return () => window.removeEventListener("keydown", saveWithShortcut);
  }, [saveDraft]);

  const selectMemoAfterSaving = async (id: number) => {
    if (id === selectedMemoId) {
      return;
    }

    const saved = await saveDraft({ allowLeaveOnError: true });
    if (saved) {
      selectMemo(id);
    }
  };

  const openMemoContextMenu = async (event: MouseEvent<HTMLButtonElement>, memo: Memo) => {
    event.preventDefault();
    event.stopPropagation();

    if (memo.id !== selectedMemoId) {
      const saved = await saveDraft({ allowLeaveOnError: true });
      if (!saved) {
        return;
      }
      selectMemo(memo.id);
    }

    setContextMenu({
      memo,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const search = async () => {
    await saveDraft({ allowLeaveOnError: true });
    await fetchMemos();
  };

  const createMemoAfterSaving = async () => {
    await saveDraft({ allowLeaveOnError: true });
    await createMemo();
  };

  const deleteDraft = async () => {
    if (!draft || !isOwner || !window.confirm(t("memo.delete.confirm"))) {
      return;
    }
    await saveDraft({ allowLeaveOnError: true });
    await deleteSelectedMemo();
  };

  return (
    <div
      className="grid h-full grid-cols-[280px_minmax(0,1fr)] overflow-hidden bg-background"
      onContextMenu={(event) => event.preventDefault()}
    >
      <section className="flex min-h-0 flex-col border-r border-border bg-card">
        <div className="shrink-0 border-b border-border p-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  search();
                }
              }}
              className="pl-8 pr-9"
              placeholder={t("memo.search.placeholder")}
            />
            {keyword && (
              <Button
                type="button"
                onClick={() => setKeyword("")}
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1.5 h-5 w-5 text-muted-foreground"
                title={t("memo.search")}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        {activeScope !== "related" && (
          <Button
            onClick={() => void createMemoAfterSaving()}
            disabled={isSaving}
            className="mx-3 my-2.5 w-[calc(100%-1.5rem)] shrink-0"
          >
            <Plus className="h-4 w-4" />
            {t("memo.new")}
          </Button>
        )}
        <div
          className="min-h-0 flex-1 overflow-auto"
          onScroll={(event) => {
            const target = event.currentTarget;
            if (target.scrollHeight - target.scrollTop - target.clientHeight < 80) {
              void fetchNextMemos();
            }
          }}
        >
          {isLoading ? (
            <EmptyMemoState icon={<Search className="h-5 w-5" />} title={t("memo.loading")} />
          ) : memos.length === 0 ? (
            <EmptyMemoState icon={<Inbox className="h-5 w-5" />} title={t("memo.empty")} />
          ) : (
            <>
              {memos.map((memo) => (
                <button
                  key={memo.id}
                  className={cn(
                    "block w-full border-l-2 border-b border-l-transparent border-border px-3 py-2 text-left transition-all duration-150 hover:border-l-primary/40 hover:bg-accent/70",
                    selectedMemoId === memo.id && "border-l-primary bg-accent"
                  )}
                  onClick={() => void selectMemoAfterSaving(memo.id)}
                  onContextMenu={(event) => void openMemoContextMenu(event, memo)}
                >
                  <div className="flex items-center gap-2">
                    {memo.isTop && <span className="text-xs text-primary">📌</span>}
                    <div
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm font-medium",
                        memo.title ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {memo.title || t("memo.title.placeholder")}
                    </div>
                    {memo.isFavorite && <Star className="h-3.5 w-3.5 fill-primary text-primary" />}
                    {memo.isShared && <Users className="h-3.5 w-3.5 text-primary" />}
                    {memo.isShared && (
                      <PermissionBadge
                        permission={memo.currentUserPermission}
                        compact
                      />
                    )}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {memo.content || t("memo.noContent")}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{formatDate(memo.updateTime)}</span>
                    <span className="inline-flex items-center gap-1">
                      <span className={cn("h-1.5 w-1.5 rounded-full", memo.status === "todo" ? "bg-yellow-500" : memo.status === "done" ? "bg-blue-500" : "bg-emerald-500")} />
                      {t(memoStatusKey(memo.status))}
                    </span>
                  </div>
                </button>
              ))}
              {(isLoadingMore || hasMoreMemos) && (
                <div className="flex h-9 items-center justify-center border-b border-border text-[11px] text-muted-foreground">
                  {isLoadingMore ? t("memo.loading") : ""}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <main className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-background">
        {draft ? (
          <>
            <div className="shrink-0 border-b border-border bg-card p-4">
              <Input
                value={draft.title}
                  onChange={(event) => {
                    setIsDraftDirty(true);
                    setDraftSaveStatus("dirty");
                    setDraft({ ...draft, title: event.target.value });
                  }}
                disabled={!canEdit}
                className="h-auto border-0 bg-transparent px-0 py-0 text-xl font-semibold tracking-normal shadow-none focus-visible:border-transparent focus-visible:ring-0"
                placeholder={t("memo.title.placeholder")}
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {!draft.isShared && (
                    <div
                      className="inline-flex h-6 items-center rounded-md border border-input bg-background px-1 text-xs text-muted-foreground"
                      title={t("memo.groups")}
                    >
                      <MemoGroupDropdown
                        groups={groups}
                        value={draft.groupId}
                        onChange={(groupId) => {
                          setIsDraftDirty(true);
                          setDraftSaveStatus("dirty");
                          setDraft({ ...draft, groupId });
                        }}
                        disabled={!canManage}
                      />
                    </div>
                  )}
                  <div className="flex h-6 shrink-0 items-center rounded-md bg-muted p-0.5">
                    {memoStatusOptions.map((status) => (
                      <button
                        key={status.value}
                        type="button"
                        onClick={() => {
                          setIsDraftDirty(true);
                          setDraftSaveStatus("dirty");
                          setDraft({ ...draft, status: status.value });
                        }}
                        disabled={!canEdit}
                        className={cn(
                          "inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs font-medium transition-colors hover:text-foreground",
                          draft.status === status.value
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground"
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", status.colorClassName)} />
                        {t(memoStatusKey(status.value))}
                      </button>
                    ))}
                  </div>
                  <span className="truncate">{t("memo.updatedAt", { time: formatDate(draft.updateTime) })}</span>
                  {(draft.updateDisplayName || draft.updateUsername) && (
                    <span className="truncate">
                      {t("memo.updatedBy", { name: draft.updateDisplayName || draft.updateUsername || "-" })}
                    </span>
                  )}
                  {draft.isShared && (
                    <span className="inline-flex h-6 items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-2 text-primary">
                      <Users className="h-3.5 w-3.5" />
                      {t("memo.sharedBy", { username: draft.ownerUsername })}
                    </span>
                  )}
                  <PermissionBadge permission={currentPermission} />
                </div>
                <Tabs value={editorMode} onValueChange={(value) => void changeEditorMode(value as typeof editorMode)}>
                  <TabsList className="h-7">
                    <TabsTrigger value="visual" className="h-6 gap-1 px-2.5">
                    <FileText className="h-3 w-3" />
                    {t("memo.editor.visual")}
                    </TabsTrigger>
                    <TabsTrigger value="markdown" className="h-6 gap-1 px-2.5">
                    <FileCode2 className="h-3 w-3" />
                    {t("memo.editor.markdown")}
                    </TabsTrigger>
                    <TabsTrigger value="split" className="h-6 gap-1 px-2.5">
                    <Columns2 className="h-3 w-3" />
                    {t("memo.editor.split")}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
            <RelatedUsersEditor
              users={draft.relatedUsers}
              ownerUsername={draft.ownerUsername}
              disabled={!canManage}
              onChange={(relatedUsers) => {
                setIsDraftDirty(true);
                setDraftSaveStatus("dirty");
                setDraft({
                  ...draft,
                  relatedUsers,
                });
              }}
            />
            <div className="min-h-0 flex-1 overflow-hidden p-3">
              <div
                className={cn(
                  "grid h-full min-h-0 gap-3",
                  editorMode === "split"
                    ? "grid-rows-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)] xl:grid-rows-1"
                    : "grid-cols-1"
                )}
              >
                {editorMode !== "markdown" && (
                  <Suspense fallback={<EmptyMemoState icon={<FileText className="h-5 w-5" />} title={t("memo.loading")} />}>
                    <MemoRichEditor
                      key={draft.id}
                      value={editorMode === "split" ? markdownPreviewContent : draft.content}
                      placeholder={t("memo.editor.placeholder")}
                      readOnly={editorMode === "split" || !canEdit}
                      onChange={editorMode === "split" ? () => undefined : updateContentFromVisualEditor}
                    />
                  </Suspense>
                )}
                {editorMode !== "visual" && (
                  <section className="flex min-h-0 flex-col overflow-hidden rounded-md border border-input bg-background">
                    <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3 text-xs font-medium text-muted-foreground">
                      <span>{t("memo.editor.markdown")}</span>
                    </div>
                    <Textarea
                      value={markdownDraft}
                      onChange={(event) => updateContentFromMarkdownSource(event.target.value)}
                      readOnly={!canEdit}
                      className="min-h-0 flex-1 resize-none rounded-none border-0 bg-background font-mono leading-7 shadow-none focus-visible:border-transparent focus-visible:ring-0"
                      placeholder={t("memo.editor.placeholder")}
                    />
                  </section>
                )}
              </div>
            </div>
            <div className="flex h-9 shrink-0 items-center justify-between border-t border-border bg-card px-3">
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <SaveStatusIndicator status={draftSaveStatus} />
                {error && <span className="text-destructive">{error}</span>}
                {!canEdit && <span>{t("memo.permission.viewHint")}</span>}
                {canEdit && !canManage && <span>{t("memo.permission.editHint")}</span>}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={async () => {
                  await saveDraft({ allowLeaveOnError: true });
                  await toggleTop(draft.id);
                }} disabled={isSaving}>
                  <Pin className={cn(draft.isTop && "fill-primary text-primary")} />
                  {draft.isTop ? t("memo.action.unpin") : t("memo.action.pin")}
                </Button>
                <Button variant="outline" size="sm" onClick={async () => {
                  await saveDraft({ allowLeaveOnError: true });
                  await toggleFavorite(draft.id);
                }} disabled={isSaving}>
                  <Star className={cn(draft.isFavorite && "fill-primary text-primary")} />
                  {t("memo.action.favorite")}
                </Button>
                {canEdit && (
                  <Button size="sm" onClick={() => void saveDraft()} disabled={isSaving || draftSaveStatus === "saving" || !isDraftDirty}>
                    <Save />
                    {t("memo.action.save")}
                  </Button>
                )}
                {canManage && (
                  <Button variant="destructive" size="sm" onClick={deleteDraft} disabled={isSaving}>
                    <Trash2 />
                    {t("memo.action.delete")}
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : (
          <EmptyMemoState icon={<FileText className="h-6 w-6" />} title={t("memo.selectOrCreate")} />
        )}
      </main>
      {contextMenu && (
        <MemoContextMenu
          memo={contextMenu.memo}
          x={contextMenu.x}
          y={contextMenu.y}
          isSaving={isSaving}
          onClose={() => setContextMenu(null)}
          onToggleTop={async () => {
            await saveDraft({ allowLeaveOnError: true });
            await toggleTop(contextMenu.memo.id);
          }}
          onToggleFavorite={async () => {
            await saveDraft({ allowLeaveOnError: true });
            await toggleFavorite(contextMenu.memo.id);
          }}
          onDelete={async () => {
            if (window.confirm(t("memo.delete.confirm"))) {
              await saveDraft({ allowLeaveOnError: true });
              await deleteMemoById(contextMenu.memo.id);
            }
          }}
        />
      )}
    </div>
  );
}

function MemoContextMenu({
  memo,
  x,
  y,
  isSaving,
  onClose,
  onToggleTop,
  onToggleFavorite,
  onDelete,
}: {
  memo: Memo;
  x: number;
  y: number;
  isSaving: boolean;
  onClose: () => void;
  onToggleTop: () => Promise<void>;
  onToggleFavorite: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const { t } = useI18n();
  const menuLeft = Math.min(x, window.innerWidth - 160);
  const menuTop = Math.min(y, window.innerHeight - 112);

  const runAction = async (action: () => Promise<void>) => {
    onClose();
    await action();
  };

  return (
    <div
      className="fixed z-50 min-w-36 overflow-hidden rounded-md border border-border bg-popover p-1 text-sm text-popover-foreground shadow-lg"
      style={{ left: Math.max(8, menuLeft), top: Math.max(8, menuTop) }}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <button
        type="button"
        disabled={isSaving}
        onClick={() => void runAction(onToggleTop)}
        className="flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Pin className={cn("h-3.5 w-3.5", memo.isTop && "fill-primary text-primary")} />
        {memo.isTop ? t("memo.action.unpin") : t("memo.action.pin")}
      </button>
      <button
        type="button"
        disabled={isSaving}
        onClick={() => void runAction(onToggleFavorite)}
        className="flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Star className={cn("h-3.5 w-3.5", memo.isFavorite && "fill-primary text-primary")} />
        {t("memo.action.favorite")}
      </button>
      <button
        type="button"
        disabled={isSaving || !memo.isOwner}
        onClick={() => void runAction(onDelete)}
        className="flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {t("memo.action.delete")}
      </button>
    </div>
  );
}

function MemoGroupDropdown({
  groups,
  value,
  onChange,
  disabled = false,
}: {
  groups: MemoGroup[];
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const selectedGroup = groups.find((group) => group.id === value) ?? groups[0];

  return (
    <Select value={String(value)} onValueChange={(next) => onChange(Number(next))} disabled={disabled}>
      <SelectTrigger className="h-5 w-[150px] max-w-[38vw] border-0 bg-transparent px-1 text-xs shadow-none focus:ring-2 focus:ring-primary/20 [&>span]:flex [&>span]:items-center">
        <span className="inline-flex h-full min-w-0 items-center gap-1.5 leading-none">
          <MemoGroupIcon group={selectedGroup} className="h-3.5 w-3.5" />
          <span className="min-w-0 truncate">{selectedGroup?.name ?? "-"}</span>
        </span>
      </SelectTrigger>
      <SelectContent className="w-44">
        {groups.map((group) => (
          <SelectItem key={group.id} value={String(group.id)} className="text-xs" hideIndicator>
            <span className="inline-flex min-w-0 items-center gap-1.5 leading-none">
              <MemoGroupIcon group={group} className="h-3.5 w-3.5" />
              <span className="min-w-0 truncate">{group.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PermissionBadge({
  permission,
  compact = false,
}: {
  permission: Memo["currentUserPermission"];
  compact?: boolean;
}) {
  const { t } = useI18n();
  const normalized = permission === "owner" || permission === "edit" ? permission : "view";
  const label =
    normalized === "owner"
      ? t(compact ? "memo.permission.ownerShort" : "memo.permission.owner")
      : normalized === "edit"
        ? t(compact ? "memo.permission.editShort" : "memo.permission.edit")
        : t(compact ? "memo.permission.viewShort" : "memo.permission.view");
  const title =
    normalized === "owner"
      ? t("memo.permission.manageHint")
      : normalized === "edit"
        ? t("memo.permission.editHint")
        : t("memo.permission.viewHint");

  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-md border px-1.5 text-[10px] font-medium",
        normalized === "owner" && "border-primary/30 bg-primary/10 text-primary",
        normalized === "edit" && "border-blue-500/30 bg-blue-500/10 text-blue-600",
        normalized === "view" && "border-border bg-muted text-muted-foreground"
      )}
      title={title}
    >
      {normalized === "edit" ? <Pencil className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
      {label}
    </span>
  );
}

function SaveStatusIndicator({ status }: { status: DraftSaveStatus }) {
  const { t } = useI18n();
  const config = {
    saved: {
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: t("memo.editor.saved"),
      className: "text-emerald-600",
    },
    dirty: {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      label: t("memo.editor.unsaved"),
      className: "text-yellow-600",
    },
    saving: {
      icon: <LoaderCircle className="h-3.5 w-3.5 animate-spin" />,
      label: t("memo.editor.saving"),
      className: "text-primary",
    },
    error: {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      label: t("memo.editor.saveFailed"),
      className: "text-destructive",
    },
  }[status];

  return (
    <span className={cn("inline-flex items-center gap-1 font-medium", config.className)}>
      {config.icon}
      {config.label}
    </span>
  );
}

function RelatedUsersEditor({
  users,
  ownerUsername,
  disabled,
  onChange,
}: {
  users: Memo["relatedUsers"];
  ownerUsername: string;
  disabled: boolean;
  onChange: (users: Memo["relatedUsers"]) => void;
}) {
  const { t } = useI18n();
  type RelatedUserOption = RemoteSelectOption & {
    username: string;
    employeeNo?: string;
    displayName?: string;
    departmentName?: string;
    email?: string;
    permission: Memo["relatedUsers"][number]["permission"];
  };

  const selectedOptions: RelatedUserOption[] = users.map((user) => ({
    value: user.username,
    label: user.displayName || user.username,
    description: [user.username, user.employeeNo].filter(Boolean).join(" · "),
    meta: user.departmentName || user.employeeNo,
    username: user.username,
    employeeNo: user.employeeNo,
    displayName: user.displayName,
    departmentName: user.departmentName,
    email: user.email,
    permission: user.permission,
  }));

  const searchOptions = async (keyword: string): Promise<RelatedUserOption[]> => {
    const result = await searchMembers(keyword, 8);
    return result.map((member) => ({
      value: member.username,
      label: member.displayName || member.username,
      description: `${member.username} · ${member.employeeNo}`,
      meta: member.departmentName,
      username: member.username,
      employeeNo: member.employeeNo,
      displayName: member.displayName,
      departmentName: member.departmentName,
      email: member.email,
      permission: "view",
    }));
  };

  const updateUsers = (options: RelatedUserOption[]) => {
    onChange(
      options.map((option) => {
        const existing = users.find((user) => user.username === option.username);
        return {
          id: existing?.id ?? -Date.now(),
          username: option.username,
          employeeNo: option.employeeNo,
          displayName: option.displayName,
          departmentName: option.departmentName,
          email: option.email,
          permission: option.permission ?? existing?.permission ?? "view",
          createTime: existing?.createTime ?? "",
          updateTime: existing?.updateTime ?? "",
        };
      })
    );
  };

  return (
    <div className="shrink-0 border-b border-border bg-card px-4 pb-3 pt-2">
      <RemoteMultiSelect
        value={selectedOptions}
        disabled={disabled}
        placeholder={t("memo.relatedUsers.placeholder")}
        emptyText={t("memo.relatedUsers.empty")}
        loadingText={t("memo.relatedUsers.searching")}
        noResultText={t("memo.relatedUsers.noResult")}
        search={searchOptions}
        onChange={updateUsers}
        filterOption={(option) => option.value !== ownerUsername}
        renderSelected={(option, actions) => (
          <span
            className="inline-flex h-6 max-w-full items-center gap-1 rounded-md bg-muted px-2 text-xs text-foreground"
            title={[option.description, option.meta].filter(Boolean).join(" · ")}
          >
            <span className="truncate">{option.label}</span>
            {option.meta && <span className="shrink-0 text-muted-foreground">{option.meta}</span>}
            {actions.disabled ? (
              <PermissionBadge permission={option.permission} compact />
            ) : (
              <>
                <button
                  type="button"
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={() =>
                    updateUsers(
                      selectedOptions.map((item) =>
                        item.username === option.username
                          ? { ...item, permission: item.permission === "edit" ? "view" : "edit" }
                          : item
                      )
                    )
                  }
                  className={cn(
                    "ml-1 inline-flex h-4 items-center gap-0.5 rounded-sm border px-1 text-[10px] transition-colors",
                    option.permission === "edit"
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  )}
                  title={option.permission === "edit" ? t("memo.permission.edit") : t("memo.permission.view")}
                >
                  {option.permission === "edit" ? <Pencil className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
                  {option.permission === "edit" ? t("memo.permission.editShort") : t("memo.permission.viewShort")}
                </button>
                <button
                  type="button"
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={actions.remove}
                  className="shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-destructive"
                  title={t("memo.relatedUsers.remove")}
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            )}
          </span>
        )}
        renderPrefix={() => (
          <span
            className="inline-flex shrink-0 items-center text-muted-foreground"
            title={t("memo.relatedUsers")}
          >
            <UserPlus className="h-3.5 w-3.5" />
          </span>
        )}
      />
    </div>
  );
}

function EmptyMemoState({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="text-center">
        <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm">
          {icon}
        </div>
        <p className="text-sm font-medium text-foreground">{title}</p>
      </div>
    </div>
  );
}
