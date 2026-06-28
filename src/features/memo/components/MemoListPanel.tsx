import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Inbox, Pin, Plus, Search, Star, Trash2, Users, X } from "lucide-react";
import {
  Button,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  Input,
} from "@/components/ui";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/utils/cn";
import type { Memo } from "../types/memo.types";
import { formatMemoDate, memoStatusKey } from "../utils/memoFormatters";
import { MemoEmptyState } from "./MemoEmptyState";
import { MemoPermissionBadge } from "./MemoPermissionBadge";

interface MemoListPanelProps {
  memos: Memo[];
  selectedMemoId: number | null;
  activeScope: string;
  keyword: string;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMoreMemos: boolean;
  isSaving: boolean;
  onKeywordChange: (keyword: string) => void;
  onSearch: () => void;
  onCreateMemo: () => void;
  onLoadMore: () => void;
  onSelectMemo: (id: number) => void;
  onPrepareContextMenu: (memo: Memo) => void;
  onToggleTop: (memo: Memo) => void;
  onToggleFavorite: (memo: Memo) => void;
  onRequestDelete: (memo: Memo) => void;
}

export function MemoListPanel({
  memos,
  selectedMemoId,
  activeScope,
  keyword,
  isLoading,
  isLoadingMore,
  hasMoreMemos,
  isSaving,
  onKeywordChange,
  onSearch,
  onCreateMemo,
  onLoadMore,
  onSelectMemo,
  onPrepareContextMenu,
  onToggleTop,
  onToggleFavorite,
  onRequestDelete,
}: MemoListPanelProps) {
  const { t } = useI18n();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: memos.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 78,
    getItemKey: (index) => memos[index]?.id ?? index,
    overscan: 6,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();
  const lastVirtualItem = virtualItems[virtualItems.length - 1];

  useEffect(() => {
    if (
      lastVirtualItem &&
      lastVirtualItem.index >= memos.length - 4 &&
      hasMoreMemos &&
      !isLoadingMore
    ) {
      onLoadMore();
    }
  }, [hasMoreMemos, isLoadingMore, lastVirtualItem, memos.length, onLoadMore]);

  return (
    <section className="flex min-h-0 flex-col border-r border-border bg-card">
      <div className="shrink-0 border-b border-border p-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onSearch();
              }
            }}
            className="pl-8 pr-9"
            placeholder={t("memo.search.placeholder")}
          />
          {keyword && (
            <Button
              type="button"
              onClick={() => onKeywordChange("")}
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
          onClick={onCreateMemo}
          disabled={isSaving}
          className="mx-3 my-2.5 w-[calc(100%-1.5rem)] shrink-0"
        >
          <Plus className="h-4 w-4" />
          {t("memo.new")}
        </Button>
      )}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        {isLoading ? (
          <MemoEmptyState icon={<Search className="h-5 w-5" />} title={t("memo.loading")} />
        ) : memos.length === 0 ? (
          <MemoEmptyState icon={<Inbox className="h-5 w-5" />} title={t("memo.empty")} />
        ) : (
          <div
            className="relative"
            style={{ height: `${rowVirtualizer.getTotalSize() + (isLoadingMore ? 36 : 0)}px` }}
          >
            {virtualItems.map((virtualItem) => {
              const memo = memos[virtualItem.index];
              return (
                <div
                  key={memo.id}
                  data-index={virtualItem.index}
                  ref={rowVirtualizer.measureElement}
                  className="absolute left-0 top-0 w-full"
                  style={{ transform: `translateY(${virtualItem.start}px)` }}
                >
                  <ContextMenu>
                    <ContextMenuTrigger asChild onContextMenu={() => onPrepareContextMenu(memo)}>
                      <Button
                        type="button"
                        variant="ghost"
                        className={cn(
                          "h-auto w-full justify-start rounded-none border-l-2 border-b border-l-transparent border-border px-3 py-2 text-left font-normal transition-all duration-150 hover:border-l-primary/40 hover:bg-accent/70",
                          selectedMemoId === memo.id && "border-l-primary bg-accent"
                        )}
                        onClick={() => onSelectMemo(memo.id)}
                      >
                        <div className="flex items-center gap-2">
                          {memo.isTop && <Pin className="h-3.5 w-3.5 fill-primary text-primary" />}
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
                            <MemoPermissionBadge permission={memo.currentUserPermission} compact />
                          )}
                        </div>
                        <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {memo.content || t("memo.noContent")}
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{formatMemoDate(memo.updateTime)}</span>
                          <span className="inline-flex items-center gap-1">
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                memo.status === "todo"
                                  ? "bg-yellow-500"
                                  : memo.status === "done"
                                    ? "bg-blue-500"
                                    : "bg-emerald-500"
                              )}
                            />
                            {t(memoStatusKey(memo.status))}
                          </span>
                        </div>
                      </Button>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="min-w-36">
                      <ContextMenuItem disabled={isSaving} onSelect={() => onToggleTop(memo)}>
                        <Pin className={cn("mr-2 h-3.5 w-3.5", memo.isTop && "fill-primary text-primary")} />
                        {memo.isTop ? t("memo.action.unpin") : t("memo.action.pin")}
                      </ContextMenuItem>
                      <ContextMenuItem disabled={isSaving} onSelect={() => onToggleFavorite(memo)}>
                        <Star className={cn("mr-2 h-3.5 w-3.5", memo.isFavorite && "fill-primary text-primary")} />
                        {t("memo.action.favorite")}
                      </ContextMenuItem>
                      <ContextMenuItem
                        disabled={isSaving || !memo.isOwner}
                        onSelect={() => onRequestDelete(memo)}
                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        {t("memo.action.delete")}
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                </div>
              );
            })}
            {isLoadingMore && (
              <div
                className="absolute left-0 flex h-9 w-full items-center justify-center border-b border-border text-[11px] text-muted-foreground"
                style={{ transform: `translateY(${rowVirtualizer.getTotalSize()}px)` }}
              >
                {t("memo.loading")}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
