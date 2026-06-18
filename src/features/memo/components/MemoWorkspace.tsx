import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { FileText } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui";
import { useI18n } from "@/i18n/useI18n";
import { useDocumentShortcut } from "@/hooks/useDocumentShortcut";
import {
  clearMemoRecoveryDraft,
  consumeMemoRecoveryDraft,
  registerMemoDraftGuard,
  saveMemoRecoveryDraft,
} from "../services/memoDraftGuard";
import { useMemoStore } from "../store/memoStore";
import type { Memo } from "../types/memo.types";
import { MemoEditorContent } from "./MemoEditorContent";
import { MemoEditorFooter } from "./MemoEditorFooter";
import { MemoEditorHeader, type MemoEditorMode } from "./MemoEditorHeader";
import { MemoEmptyState } from "./MemoEmptyState";
import { MemoListPanel } from "./MemoListPanel";
import { MemoRelatedUsersEditor } from "./MemoRelatedUsersEditor";
import type { DraftSaveStatus } from "./MemoSaveStatusIndicator";

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
            <MemoEditorContent
              memoId={draft.id}
              editorMode={editorMode}
              visualContent={editorMode === "split" ? markdownPreviewContent : draft.content}
              markdownContent={markdownDraft}
              canEdit={canEdit}
              onVisualChange={updateContentFromVisualEditor}
              onMarkdownChange={updateContentFromMarkdownSource}
            />
            <MemoEditorFooter
              memo={draft}
              saveStatus={draftSaveStatus}
              error={error}
              canEdit={canEdit}
              canManage={canManage}
              isSaving={isSaving}
              isDraftDirty={isDraftDirty}
              onToggleTop={() => {
                void (async () => {
                  await saveDraft({ allowLeaveOnError: true });
                  await toggleTop(draft.id);
                })();
              }}
              onToggleFavorite={() => {
                void (async () => {
                  await saveDraft({ allowLeaveOnError: true });
                  await toggleFavorite(draft.id);
                })();
              }}
              onSave={() => void saveDraft()}
              onDelete={() => requestDeleteMemo(draft)}
            />
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
