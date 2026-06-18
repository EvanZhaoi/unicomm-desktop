import { Eye, Pencil, UserPlus, X } from "lucide-react";
import { Button, RemoteMultiSelect, type RemoteSelectOption } from "@/components/ui";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/utils/cn";
import { searchMembers } from "../api/memoApi";
import type { Memo } from "../types/memo.types";
import { MemoPermissionBadge } from "./MemoPermissionBadge";

interface MemoRelatedUsersEditorProps {
  users: Memo["relatedUsers"];
  ownerUsername: string;
  disabled: boolean;
  onChange: (users: Memo["relatedUsers"]) => void;
}

type RelatedUserOption = RemoteSelectOption & {
  username: string;
  employeeNo?: string;
  displayName?: string;
  departmentName?: string;
  email?: string;
  permission: Memo["relatedUsers"][number]["permission"];
};

/**
 * Owns member searching and the view/edit permission controls for Memo sharing.
 * Persistence remains in MemoWorkspace so this component can focus on editing
 * the related-user value without knowing how the Memo is saved.
 */
export function MemoRelatedUsersEditor({
  users,
  ownerUsername,
  disabled,
  onChange,
}: MemoRelatedUsersEditorProps) {
  const { t } = useI18n();
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
    const temporaryIdBase = Date.now();
    onChange(
      options.map((option, index) => {
        const existing = users.find((user) => user.username === option.username);
        return {
          id: existing?.id ?? -(temporaryIdBase + index),
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
                  {option.permission === "edit" ? <Pencil /> : <Eye />}
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
                  <X />
                </Button>
              </>
            )}
          </span>
        )}
        renderPrefix={() => (
          <span className="inline-flex shrink-0 items-center text-muted-foreground" title={t("memo.relatedUsers")}>
            <UserPlus className="h-3.5 w-3.5" />
          </span>
        )}
      />
    </div>
  );
}
