import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { FileText, Pin, Save, Star, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Textarea,
} from "@/components/ui";
import { useI18n } from "@/i18n/useI18n";
import { useDocumentShortcut } from "@/hooks/useDocumentShortcut";
import { cn } from "@/utils/cn";
import {
  clearMemoRecoveryDraft,
  consumeMemoRecoveryDraft,
  registerMemoDraftGuard,
  saveMemoRecoveryDraft,
} from "../services/memoDraftGuard";
import { useMemoStore } from "../store/memoStore";
import type { Memo } from "../types/memo.types";
import { MemoEditorHeader, type MemoEditorMode } from "./MemoEditorHeader";
import { MemoEmptyState } from "./MemoEmptyState";
import { MemoListPanel } from "./MemoListPanel";
import { MemoRelatedUsersEditor } from "./MemoRelatedUsersEditor";
import { MemoSaveStatusIndicator, type DraftSaveStatus } from "./MemoSaveStatusIndicator";

const MemoRichEditor = lazy(() => import("./MemoRichEditor"));

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
  const [editorMode, setEditorMode] = useState<MemoEditorMode>("visual");
  const [markdownDraft, setMarkdownDraft] = useState("");
  const [markdownPreviewContent, setMarkdownPreviewContent] = useState("");
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  const [draftSaveStatus, setDraftSaveStatus] = useState<DraftSaveStatus>("saved");
  const [detailReadyMemoId, setDetailReadyMemoId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Memo | null>(null);
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

  const changeEditorMode = async (nextMode: MemoEditorMode) => {
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

  useDocumentShortcut({
    key: "s",
    ctrlOrMeta: true,
    onTrigger: () => void saveDraft(),
  });

  const selectMemoAfterSaving = async (id: number) => {
    if (id === selectedMemoId) {
      return;
    }

    const saved = await saveDraft({ allowLeaveOnError: true });
    if (saved) {
      selectMemo(id);
    }
  };

  const prepareMemoContextMenu = async (memo: Memo) => {
    if (memo.id !== selectedMemoId) {
      const saved = await saveDraft({ allowLeaveOnError: true });
      if (!saved) {
        return false;
      }
      selectMemo(memo.id);
    }

    return true;
  };

  const toggleMemoTopFromMenu = async (memo: Memo) => {
    await saveDraft({ allowLeaveOnError: true });
    await toggleTop(memo.id);
  };

  const toggleMemoFavoriteFromMenu = async (memo: Memo) => {
    await saveDraft({ allowLeaveOnError: true });
    await toggleFavorite(memo.id);
  };

  const requestDeleteMemo = (memo: Memo) => {
    if (memo.isOwner) {
      setDeleteTarget(memo);
    }
  };

  const search = async () => {
    await saveDraft({ allowLeaveOnError: true });
    await fetchMemos();
  };

  const createMemoAfterSaving = async () => {
    await saveDraft({ allowLeaveOnError: true });
    await createMemo();
  };

  const confirmDeleteMemo = async () => {
    if (!deleteTarget) {
      return;
    }
    await saveDraft({ allowLeaveOnError: true });
    await deleteMemoById(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div
      className="grid h-full grid-cols-[280px_minmax(0,1fr)] overflow-hidden bg-background"
      onContextMenu={(event) => event.preventDefault()}
    >
      <MemoListPanel
        memos={memos}
        selectedMemoId={selectedMemoId}
        activeScope={activeScope}
        keyword={keyword}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMoreMemos={hasMoreMemos}
        isSaving={isSaving}
        onKeywordChange={setKeyword}
        onSearch={() => void search()}
        onCreateMemo={() => void createMemoAfterSaving()}
        onLoadMore={() => void fetchNextMemos()}
        onSelectMemo={(id) => void selectMemoAfterSaving(id)}
        onPrepareContextMenu={(memo) => void prepareMemoContextMenu(memo)}
        onToggleTop={(memo) => void toggleMemoTopFromMenu(memo)}
        onToggleFavorite={(memo) => void toggleMemoFavoriteFromMenu(memo)}
        onRequestDelete={requestDeleteMemo}
      />

      <main className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-background">
        {draft ? (
          <>
            <MemoEditorHeader
              draft={draft}
              groups={groups}
              editorMode={editorMode}
              currentPermission={currentPermission}
              canEdit={canEdit}
              canManage={canManage}
              onTitleChange={(title) => {
                setIsDraftDirty(true);
                setDraftSaveStatus("dirty");
                setDraft({ ...draft, title });
              }}
              onGroupChange={(groupId) => {
                setIsDraftDirty(true);
                setDraftSaveStatus("dirty");
                setDraft({ ...draft, groupId });
              }}
              onStatusChange={(status) => {
                setIsDraftDirty(true);
                setDraftSaveStatus("dirty");
                setDraft({ ...draft, status });
              }}
              onEditorModeChange={(mode) => void changeEditorMode(mode)}
            />
            <MemoRelatedUsersEditor
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
                  <Suspense fallback={<MemoEmptyState icon={<FileText className="h-5 w-5" />} title={t("memo.loading")} />}>
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
                <MemoSaveStatusIndicator status={draftSaveStatus} />
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
                  <Button variant="destructive" size="sm" onClick={() => draft && requestDeleteMemo(draft)} disabled={isSaving}>
                    <Trash2 />
                    {t("memo.action.delete")}
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : (
          <MemoEmptyState icon={<FileText className="h-6 w-6" />} title={t("memo.selectOrCreate")} />
        )}
      </main>
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("memo.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("memo.delete.confirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>{t("memo.delete.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSaving}
              onClick={(event) => {
                event.preventDefault();
                void confirmDeleteMemo();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("memo.delete.submit")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
