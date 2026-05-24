import { useEffect, useMemo, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  Archive,
  FileText,
  Folder,
  Plus,
  Save,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui";
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

export function MemoWorkspace() {
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
    <div className="grid h-[calc(100vh-5.5rem)] grid-cols-[220px_320px_minmax(0,1fr)] overflow-hidden border border-border bg-background">
      <aside className="border-r border-border bg-muted/30">
        <div className="flex h-14 items-center justify-between border-b border-border px-3">
          <div className="text-sm font-semibold">备忘录</div>
          <Button size="icon" variant="ghost" onClick={createMemo} disabled={isSaving} title="新建 Memo">
            <Plus />
          </Button>
        </div>
        <nav className="p-2">
          <button
            className={cn(
              "flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm",
              activeGroupId === null ? "bg-accent text-accent-foreground" : "hover:bg-accent"
            )}
            onClick={() => chooseGroup(null)}
          >
            <FileText className="h-4 w-4" />
            <span className="flex-1 truncate">全部</span>
            <span className="text-xs text-muted-foreground">{memos.length}</span>
          </button>
          <div className="mt-3 space-y-1">
            {groups.map((group) => (
              <button
                key={group.id}
                className={cn(
                  "flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm",
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

      <section className="border-r border-border">
        <div className="flex h-14 items-center gap-2 border-b border-border px-3">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  search();
                }
              }}
              className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              placeholder="搜索标题或内容"
            />
          </div>
          <Button size="icon" variant="outline" onClick={search} title="搜索">
            <Search />
          </Button>
        </div>
        <div className="h-[calc(100%-3.5rem)] overflow-auto">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">加载中...</div>
          ) : memos.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">暂无备忘录</div>
          ) : (
            memos.map((memo) => (
              <button
                key={memo.id}
                className={cn(
                  "block w-full border-b border-border p-3 text-left hover:bg-accent",
                  selectedMemoId === memo.id && "bg-accent"
                )}
                onClick={() => selectMemo(memo.id)}
              >
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1 truncate text-sm font-medium">{memo.title}</div>
                  {memo.isTop && <span className="text-xs text-primary">置顶</span>}
                </div>
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {memo.content || "无内容"}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">{formatDate(memo.updateTime)}</div>
              </button>
            ))
          )}
        </div>
      </section>

      <main className="flex min-w-0 flex-col">
        {draft ? (
          <>
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" onClick={() => toggleTop(draft.id)} title="置顶">
                  <FileText className={cn(draft.isTop && "text-primary")} />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => toggleFavorite(draft.id)} title="收藏">
                  <Star className={cn(draft.isFavorite && "fill-primary text-primary")} />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => toggleArchive(draft.id)} title="归档">
                  <Archive />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {error && <span className="text-xs text-destructive">{error}</span>}
                <Button variant="outline" onClick={deleteSelectedMemo} disabled={isSaving}>
                  <Trash2 />
                  删除
                </Button>
                <Button onClick={saveDraft} disabled={isSaving}>
                  <Save />
                  保存
                </Button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-3 p-5">
              <input
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                className="w-full border-0 bg-transparent text-2xl font-semibold outline-none"
                placeholder="无标题"
              />
              <div className="flex items-center gap-3 text-sm">
                <select
                  value={draft.groupId}
                  onChange={(event) => setDraft({ ...draft, groupId: Number(event.target.value) })}
                  className="h-9 rounded-md border border-input bg-background px-2 outline-none"
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
                  className="h-9 rounded-md border border-input bg-background px-2 outline-none"
                >
                  <option value="normal">普通</option>
                  <option value="todo">待办</option>
                  <option value="done">完成</option>
                </select>
                <span className="text-xs text-muted-foreground">更新于 {formatDate(draft.updateTime)}</span>
              </div>
              <textarea
                value={draft.content}
                onChange={(event) => setDraft({ ...draft, content: event.target.value })}
                className="min-h-0 flex-1 resize-none rounded-md border border-input bg-background p-3 font-mono text-sm leading-6 outline-none focus:ring-1 focus:ring-ring"
                placeholder="输入 Markdown 内容..."
              />
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            选择或新建一条备忘录
          </div>
        )}
      </main>
    </div>
  );
}
