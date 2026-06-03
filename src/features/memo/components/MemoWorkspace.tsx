import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  Archive,
  Check,
  ChevronDown,
  Columns2,
  Eye,
  FileCode2,
  FileText,
  Folder,
  Inbox,
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
import { Button, RemoteMultiSelect, Select, type RemoteSelectOption } from "@/components/ui";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/utils/cn";
import { searchMembers } from "../api/memoApi";
import { useMemoStore } from "../store/memoStore";
import type { Memo, MemoGroup } from "../types/memo.types";

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
  const [editorMode, setEditorMode] = useState<"visual" | "markdown" | "split">("visual");
  const [markdownSyncVersion, setMarkdownSyncVersion] = useState(0);
  const isOwner = draft?.isOwner !== false;
  const canEdit = isOwner || draft?.currentUserPermission === "edit";

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
    setMarkdownSyncVersion((version) => version + 1);
  }, [selectedMemo]);

  const saveDraft = async () => {
    if (!draft || !canEdit) {
      return;
    }
    await updateSelectedMemo({
      title: draft.title,
      content: draft.content,
      groupId: isOwner ? draft.groupId : undefined,
      status: draft.status,
      relatedUsers: isOwner
        ? draft.relatedUsers.map((user) => ({
            username: user.username,
            permission: user.permission,
          }))
        : undefined,
    });
  };

  const chooseGroup = async (groupId: number | null) => {
    setActiveGroup(groupId);
    await fetchMemos();
  };

  const search = async () => {
    await fetchMemos();
  };

  const deleteDraft = async () => {
    if (!draft || !isOwner || !window.confirm(t("memo.delete.confirm"))) {
      return;
    }
    await deleteSelectedMemo();
  };

  return (
    <div className="grid h-full grid-cols-[280px_minmax(0,1fr)] overflow-hidden bg-background">
      <section className="min-h-0 border-r border-border bg-card">
        <div className="border-b border-border p-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  search();
                }
              }}
              className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-9 text-sm outline-none transition-all duration-150 focus:border-ring focus:ring-[3px] focus:ring-primary/10"
              placeholder={t("memo.search.placeholder")}
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword("")}
                className="absolute right-2 top-1.5 flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title={t("memo.search")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <button
          onClick={createMemo}
          disabled={isSaving}
          className="mx-3 my-2.5 flex w-[calc(100%-1.5rem)] items-center justify-center gap-1 rounded-md bg-primary px-3 py-2 text-[13px] font-medium text-primary-foreground shadow-sm transition-colors duration-150 hover:bg-primary/90 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {t("memo.new")}
        </button>
        <div className="px-3 pb-2">
          <Select
            value={activeGroupId ?? ""}
            onChange={(event) => chooseGroup(event.target.value ? Number(event.target.value) : null)}
            className="w-full"
            selectClassName="h-7 text-xs text-muted-foreground"
          >
            <option value="">{t("memo.all")}</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="h-[calc(100%-9.25rem)] overflow-auto">
          {isLoading ? (
            <EmptyMemoState icon={<Search className="h-5 w-5" />} title={t("memo.loading")} />
          ) : memos.length === 0 ? (
            <EmptyMemoState icon={<Inbox className="h-5 w-5" />} title={t("memo.empty")} />
          ) : (
            memos.map((memo) => (
              <button
                key={memo.id}
                className={cn(
                  "block w-full border-l-2 border-b border-l-transparent border-border px-3 py-2 text-left transition-all duration-150 hover:border-l-primary/40 hover:bg-accent/70",
                  selectedMemoId === memo.id && "border-l-primary bg-accent"
                )}
                onClick={() => selectMemo(memo.id)}
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
            ))
          )}
        </div>
      </section>

      <main className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-background">
        {draft ? (
          <>
            <div className="shrink-0 border-b border-border bg-card p-4">
              <input
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                disabled={!canEdit}
                className="w-full border-0 bg-transparent text-xl font-semibold tracking-normal text-foreground outline-none placeholder:text-muted-foreground"
                placeholder={t("memo.title.placeholder")}
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <div className="inline-flex h-6 items-center gap-1.5 rounded-md border border-input bg-background px-2 text-xs text-muted-foreground">
                    <Folder className="h-3.5 w-3.5" />
                    <span className="shrink-0">{t("memo.groups")}</span>
                    <MemoGroupDropdown
                      groups={groups}
                      value={draft.groupId}
                      onChange={(groupId) => setDraft({ ...draft, groupId })}
                      disabled={!isOwner}
                    />
                  </div>
                  <div className="flex h-6 shrink-0 items-center rounded-md bg-muted p-0.5">
                    {memoStatusOptions.map((status) => (
                      <button
                        key={status.value}
                        type="button"
                        onClick={() => setDraft({ ...draft, status: status.value })}
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
                  {draft.isShared && (
                    <span className="inline-flex h-6 items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-2 text-primary">
                      <Users className="h-3.5 w-3.5" />
                      {t("memo.sharedBy", { username: draft.ownerUsername })}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 gap-0.5 rounded-md bg-muted p-0.5">
                  <button
                    type="button"
                    onClick={() => setEditorMode("visual")}
                    className={cn(
                      "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-colors hover:text-foreground",
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
                      "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-colors hover:text-foreground",
                      editorMode === "markdown" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                    )}
                  >
                    <FileCode2 className="h-3 w-3" />
                    {t("memo.editor.markdown")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode("split")}
                    className={cn(
                      "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-colors hover:text-foreground",
                      editorMode === "split" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                    )}
                  >
                    <Columns2 className="h-3 w-3" />
                    {t("memo.editor.split")}
                  </button>
                </div>
              </div>
            </div>
            <RelatedUsersEditor
              users={draft.relatedUsers}
              ownerUsername={draft.ownerUsername}
              disabled={!isOwner}
              onChange={(relatedUsers) =>
                setDraft({
                  ...draft,
                  relatedUsers,
                })
              }
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
                      key={`${draft.id}-${draft.updateTime}-${markdownSyncVersion}`}
                      value={draft.content}
                      placeholder={t("memo.editor.placeholder")}
                      readOnly={!canEdit}
                      onChange={(content) => setDraft({ ...draft, content })}
                    />
                  </Suspense>
                )}
                {editorMode !== "visual" && (
                  <section className="flex min-h-0 flex-col overflow-hidden rounded-md border border-input bg-background">
                    <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3 text-xs font-medium text-muted-foreground">
                      <span>{t("memo.editor.markdown")}</span>
                    </div>
                    <textarea
                      value={draft.content}
                      onChange={(event) => {
                        setDraft({ ...draft, content: event.target.value });
                        setMarkdownSyncVersion((version) => version + 1);
                      }}
                      readOnly={!canEdit}
                      className="min-h-0 flex-1 resize-none bg-background p-3 font-mono text-sm leading-7 text-foreground outline-none placeholder:text-muted-foreground"
                      placeholder={t("memo.editor.placeholder")}
                    />
                  </section>
                )}
              </div>
            </div>
            <div className="flex h-9 shrink-0 items-center justify-between border-t border-border bg-card px-3">
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{t("memo.editor.saved")}</span>
                {error && <span className="text-destructive">{error}</span>}
                {!canEdit && <span>{t("memo.shared.readonly")}</span>}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => toggleTop(draft.id)} disabled={isSaving || !isOwner}>
                  <Pin className={cn(draft.isTop && "fill-primary text-primary")} />
                  {draft.isTop ? t("memo.action.unpin") : t("memo.action.pin")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleArchive(draft.id)} disabled={isSaving || !isOwner}>
                  <Archive />
                  {t("memo.action.archive")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleFavorite(draft.id)} disabled={isSaving || !isOwner}>
                  <Star className={cn(draft.isFavorite && "fill-primary text-primary")} />
                  {t("memo.action.favorite")}
                </Button>
                <Button size="sm" onClick={saveDraft} disabled={isSaving || !canEdit}>
                  <Save />
                  {t("memo.action.save")}
                </Button>
                <Button variant="destructive" size="sm" onClick={deleteDraft} disabled={isSaving || !isOwner}>
                  <Trash2 />
                  {t("memo.action.delete")}
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
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const selectedGroup = groups.find((group) => group.id === value) ?? groups[0];

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={disabled}
        className="inline-flex h-5 w-[132px] items-center justify-between gap-2 rounded-sm px-1 text-left text-xs text-foreground transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <GroupMark group={selectedGroup} />
          <span className="truncate">{selectedGroup?.name ?? "-"}</span>
        </span>
        <ChevronDown className={cn("h-3 w-3 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-6 z-30 w-44 overflow-hidden rounded-md border border-border bg-popover p-1 text-xs text-popover-foreground shadow-lg">
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => {
                onChange(group.id);
                setOpen(false);
              }}
              className={cn(
                "flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground",
                group.id === value && "bg-accent text-accent-foreground"
              )}
            >
              <GroupMark group={group} />
              <span className="min-w-0 flex-1 truncate">{group.name}</span>
              {group.id === value && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
            </button>
          ))}
        </div>
      )}
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
    <div className="shrink-0 border-b border-border bg-card px-4 pb-3">
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
            {!actions.disabled && (
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
          <span className="inline-flex shrink-0 items-center gap-1 text-muted-foreground">
            <UserPlus className="h-3.5 w-3.5" />
            {t("memo.relatedUsers")}
          </span>
        )}
      />
    </div>
  );
}

function GroupMark({ group }: { group?: MemoGroup }) {
  if (group?.icon) {
    return <span className="shrink-0 text-[11px] leading-none">{group.icon}</span>;
  }

  return (
    <span
      className="h-2.5 w-2.5 shrink-0 rounded-full border border-border"
      style={{ backgroundColor: group?.color || "var(--primary)" }}
    />
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
