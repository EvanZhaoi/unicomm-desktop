import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Eye, FileText, Pencil, Pin, Save, Star, Trash2, UserPlus, X } from "lucide-react";
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
  RemoteMultiSelect,
  Textarea,
  type RemoteSelectOption,
} from "@/components/ui";
import { useI18n } from "@/i18n/useI18n";
import { useDocumentShortcut } from "@/hooks/useDocumentShortcut";
import { cn } from "@/utils/cn";
import { searchMembers } from "../api/memoApi";
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
import { MemoPermissionBadge } from "./MemoPermissionBadge";
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
              <MemoPermissionBadge permission={option.permission} compact />
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
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
                    "ml-1 h-4 gap-0.5 rounded-sm px-1 text-[10px] [&_svg]:size-2.5",
                    option.permission === "edit"
                      ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title={option.permission === "edit" ? t("memo.permission.edit") : t("memo.permission.view")}
                >
                  {option.permission === "edit" ? <Pencil className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
                  {option.permission === "edit" ? t("memo.permission.editShort") : t("memo.permission.viewShort")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={actions.remove}
                  className="h-4 w-4 shrink-0 rounded-sm p-0 text-muted-foreground hover:bg-transparent hover:text-destructive [&_svg]:size-3"
                  title={t("memo.relatedUsers.remove")}
                >
                  <X className="h-3 w-3" />
                </Button>
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
