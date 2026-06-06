import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  Columns2,
  Eye,
  FileCode2,
  FileText,
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

export function MemoWorkspace() {
  const { t } = useI18n();
  const {
    memos,
    groups,
    selectedMemoId,
    activeScope,
    keyword,
    isLoading,
    isSaving,
    error,
    fetchInitialData,
    fetchMemos,
    setKeyword,
    createMemo,
    updateSelectedMemo,
    deleteSelectedMemo,
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
  const [markdownSyncVersion, setMarkdownSyncVersion] = useState(0);
  const currentPermission = draft?.currentUserPermission ?? "view";
  const isOwner = currentPermission === "owner" || draft?.isOwner === true;
  const canEdit = isOwner || currentPermission === "edit";
  const canManage = isOwner;
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
      groupId: canManage ? draft.groupId : undefined,
      status: draft.status,
      relatedUsers: canManage
        ? draft.relatedUsers.map((user) => ({
            username: user.username,
            permission: user.permission,
          }))
        : undefined,
    });
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
            onClick={createMemo}
            disabled={isSaving}
            className="mx-3 my-2.5 w-[calc(100%-1.5rem)] shrink-0"
          >
            <Plus className="h-4 w-4" />
            {t("memo.new")}
          </Button>
        )}
        <div className="min-h-0 flex-1 overflow-auto">
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
            ))
          )}
        </div>
      </section>

      <main className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-background">
        {draft ? (
          <>
            <div className="shrink-0 border-b border-border bg-card p-4">
              <Input
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                disabled={!canEdit}
                className="h-auto border-0 bg-transparent px-0 py-0 text-xl font-semibold tracking-normal shadow-none focus-visible:border-transparent focus-visible:ring-0"
                placeholder={t("memo.title.placeholder")}
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <div
                    className="inline-flex h-6 items-center rounded-md border border-input bg-background px-1 text-xs text-muted-foreground"
                    title={t("memo.groups")}
                  >
                    <MemoGroupDropdown
                      groups={groups}
                      value={draft.groupId}
                      onChange={(groupId) => setDraft({ ...draft, groupId })}
                      disabled={!canManage}
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
                  <PermissionBadge permission={currentPermission} />
                </div>
                <Tabs value={editorMode} onValueChange={(value) => setEditorMode(value as typeof editorMode)}>
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
                    <Textarea
                      value={draft.content}
                      onChange={(event) => {
                        setDraft({ ...draft, content: event.target.value });
                        setMarkdownSyncVersion((version) => version + 1);
                      }}
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
                <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{t("memo.editor.saved")}</span>
                {error && <span className="text-destructive">{error}</span>}
                {!canEdit && <span>{t("memo.permission.viewHint")}</span>}
                {canEdit && !canManage && <span>{t("memo.permission.editHint")}</span>}
              </div>
              <div className="flex items-center gap-2">
                {canManage && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => toggleTop(draft.id)} disabled={isSaving}>
                      <Pin className={cn(draft.isTop && "fill-primary text-primary")} />
                      {draft.isTop ? t("memo.action.unpin") : t("memo.action.pin")}
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" onClick={() => toggleFavorite(draft.id)} disabled={isSaving}>
                  <Star className={cn(draft.isFavorite && "fill-primary text-primary")} />
                  {t("memo.action.favorite")}
                </Button>
                {canEdit && (
                  <Button size="sm" onClick={saveDraft} disabled={isSaving}>
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
