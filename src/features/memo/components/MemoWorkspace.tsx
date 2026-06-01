import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  Archive,
  Bold,
  CheckSquare,
  Code,
  FileCode2,
  FileText,
  Heading1,
  Image,
  Inbox,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Plus,
  Quote,
  Save,
  Search,
  Star,
  Strikethrough,
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInlineMarkdown(value: string): string {
  return escapeHtml(value)
    .replace(/!\[([^\]]*)\]\((data:image\/[^)]+|https?:\/\/[^)]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/~~([^~]+)~~/g, "<s>$1</s>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function markdownToHtml(content: string): string {
  const lines = content.split("\n");
  const html: string[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  lines.forEach((line) => {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
      }
      inCodeBlock = !inCodeBlock;
      return;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    if (line.startsWith("# ")) {
      html.push(`<h1>${renderInlineMarkdown(line.slice(2))}</h1>`);
      return;
    }
    if (line.startsWith("## ")) {
      html.push(`<h2>${renderInlineMarkdown(line.slice(3))}</h2>`);
      return;
    }
    if (line.startsWith("- [ ] ")) {
      html.push(`<p><input type="checkbox" disabled /> ${renderInlineMarkdown(line.slice(6))}</p>`);
      return;
    }
    if (line.startsWith("- ")) {
      html.push(`<ul><li>${renderInlineMarkdown(line.slice(2))}</li></ul>`);
      return;
    }
    if (/^\d+\.\s/.test(line)) {
      html.push(`<ol><li>${renderInlineMarkdown(line.replace(/^\d+\.\s/, ""))}</li></ol>`);
      return;
    }
    if (line.startsWith("> ")) {
      html.push(`<blockquote>${renderInlineMarkdown(line.slice(2))}</blockquote>`);
      return;
    }
    if (line === "---") {
      html.push("<hr />");
      return;
    }
    if (!line.trim()) {
      html.push("<p><br /></p>");
      return;
    }
    html.push(`<p>${renderInlineMarkdown(line)}</p>`);
  });

  if (codeLines.length > 0) {
    html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  }

  return html.join("");
}

function inlineNodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }

  if (!(node instanceof HTMLElement)) {
    return "";
  }

  const childText = Array.from(node.childNodes).map(inlineNodeToMarkdown).join("");
  const tagName = node.tagName.toLowerCase();

  if (tagName === "strong" || tagName === "b") {
    return `**${childText}**`;
  }
  if (tagName === "em" || tagName === "i") {
    return `*${childText}*`;
  }
  if (tagName === "s" || tagName === "strike") {
    return `~~${childText}~~`;
  }
  if (tagName === "code") {
    return `\`${childText}\``;
  }
  if (tagName === "a") {
    return `[${childText}](${node.getAttribute("href") ?? ""})`;
  }
  if (tagName === "img") {
    return `![${node.getAttribute("alt") ?? "image"}](${node.getAttribute("src") ?? ""})`;
  }

  return childText;
}

function blockNodeToMarkdown(node: Node, index: number): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.trim() ?? "";
  }

  if (!(node instanceof HTMLElement)) {
    return "";
  }

  const tagName = node.tagName.toLowerCase();
  const inlineText = Array.from(node.childNodes).map(inlineNodeToMarkdown).join("").trim();

  if (tagName === "h1") {
    return `# ${inlineText}`;
  }
  if (tagName === "h2") {
    return `## ${inlineText}`;
  }
  if (tagName === "blockquote") {
    return `> ${inlineText}`;
  }
  if (tagName === "pre") {
    return `\`\`\`\n${node.textContent ?? ""}\n\`\`\``;
  }
  if (tagName === "ul") {
    return Array.from(node.querySelectorAll(":scope > li"))
      .map((item) => `- ${Array.from(item.childNodes).map(inlineNodeToMarkdown).join("").trim()}`)
      .join("\n");
  }
  if (tagName === "ol") {
    return Array.from(node.querySelectorAll(":scope > li"))
      .map((item, itemIndex) => `${itemIndex + 1}. ${Array.from(item.childNodes).map(inlineNodeToMarkdown).join("").trim()}`)
      .join("\n");
  }
  if (tagName === "hr") {
    return "---";
  }
  if (tagName === "p" && node.querySelector('input[type="checkbox"]')) {
    return `- [ ] ${inlineText}`;
  }
  if (tagName === "div" && index > 0 && inlineText === "") {
    return "";
  }

  return inlineText;
}

function htmlToMarkdown(html: string): string {
  const container = document.createElement("div");
  container.innerHTML = html;
  return Array.from(container.childNodes)
    .map(blockNodeToMarkdown)
    .filter((line, index, lines) => line !== "" || index < lines.length - 1)
    .join("\n")
    .trim();
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
    selectMemo,
    toggleFavorite,
    toggleArchive,
  } = useMemoStore();

  const selectedMemo = useMemo(
    () => memos.find((memo) => memo.id === selectedMemoId) ?? null,
    [memos, selectedMemoId]
  );
  const [draft, setDraft] = useState<Memo | null>(null);
  const [editorMode, setEditorMode] = useState<"visual" | "markdown">("visual");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const visualEditorRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    if (editorMode !== "visual" || !draft || !visualEditorRef.current) {
      return;
    }

    visualEditorRef.current.innerHTML = markdownToHtml(draft.content);
  }, [draft?.id, editorMode]);

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

  const syncVisualEditor = () => {
    if (!draft || !visualEditorRef.current) {
      return;
    }

    setDraft({ ...draft, content: htmlToMarkdown(visualEditorRef.current.innerHTML) });
  };

  const focusVisualEditor = () => {
    visualEditorRef.current?.focus();
  };

  const execRichCommand = (command: string, value?: string) => {
    if (editorMode !== "visual") {
      return;
    }

    focusVisualEditor();
    document.execCommand(command, false, value);
    syncVisualEditor();
  };

  const insertVisualHtml = (html: string) => {
    if (editorMode !== "visual") {
      return;
    }

    focusVisualEditor();
    document.execCommand("insertHTML", false, html);
    syncVisualEditor();
  };

  const insertMarkdown = (prefix: string, suffix = "", placeholder = "") => {
    if (!draft) {
      return;
    }

    const textarea = textareaRef.current;
    const currentContent = draft.content;
    const selectionStart = textarea?.selectionStart ?? currentContent.length;
    const selectionEnd = textarea?.selectionEnd ?? currentContent.length;
    const selectedText = currentContent.slice(selectionStart, selectionEnd) || placeholder;
    const insertedText = `${prefix}${selectedText}${suffix}`;
    const nextContent =
      currentContent.slice(0, selectionStart) + insertedText + currentContent.slice(selectionEnd);

    setDraft({ ...draft, content: nextContent });
    setEditorMode("markdown");

    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      const nextStart = selectionStart + prefix.length;
      const nextEnd = nextStart + selectedText.length;
      textareaRef.current?.setSelectionRange(nextStart, nextEnd);
    });
  };

  const insertBlock = (text: string) => {
    if (!draft) {
      return;
    }

    const textarea = textareaRef.current;
    const currentContent = draft.content;
    const selectionStart = textarea?.selectionStart ?? currentContent.length;
    const needsLeadingBreak = currentContent.length > 0 && !currentContent.endsWith("\n");
    const block = `${needsLeadingBreak ? "\n" : ""}${text}`;

    setDraft({
      ...draft,
      content: currentContent.slice(0, selectionStart) + block + currentContent.slice(selectionStart),
    });
    setEditorMode("markdown");

    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      const cursor = selectionStart + block.length;
      textareaRef.current?.setSelectionRange(cursor, cursor);
    });
  };

  const applyInlineFormat = (command: string, prefix: string, suffix = prefix, placeholder = "") => {
    if (editorMode === "visual") {
      execRichCommand(command);
      return;
    }

    insertMarkdown(prefix, suffix, placeholder);
  };

  const applyBlockFormat = (command: string, markdownBlock: string, value?: string) => {
    if (editorMode === "visual") {
      execRichCommand(command, value);
      return;
    }

    insertBlock(markdownBlock);
  };

  const insertLink = () => {
    if (editorMode === "visual") {
      const url = window.prompt("URL");
      if (url) {
        execRichCommand("createLink", url);
      }
      return;
    }

    insertMarkdown("[", "](https://)", "链接文本");
  };

  const insertImageDataUrl = (dataUrl: string) => {
    if (editorMode === "visual") {
      insertVisualHtml(`<img src="${dataUrl}" alt="image" />`);
      return;
    }

    insertBlock(`![image](${dataUrl})`);
  };

  const chooseImage = () => {
    imageInputRef.current?.click();
  };

  const handleImageSelected = (file: File | undefined) => {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        insertImageDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid h-full grid-cols-[320px_minmax(0,1fr)] overflow-hidden bg-background">
      <section className="min-h-0 border-r border-border bg-card">
        <div className="border-b border-border p-4">
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
        </div>
        <button
          onClick={createMemo}
          disabled={isSaving}
          className="mx-4 my-3 flex w-[calc(100%-2rem)] items-center justify-center gap-1 rounded-md bg-primary px-3 py-2.5 text-[13px] font-medium text-primary-foreground shadow-sm transition-all duration-150 hover:-translate-y-px hover:shadow-md disabled:pointer-events-none disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {t("memo.new")}
        </button>
        <div className="px-4 pb-2">
          <select
            value={activeGroupId ?? ""}
            onChange={(event) => chooseGroup(event.target.value ? Number(event.target.value) : null)}
            className="h-8 w-full rounded-sm border border-input bg-background px-2 text-xs text-muted-foreground outline-none focus:border-ring focus:ring-[3px] focus:ring-primary/10"
          >
            <option value="">{t("memo.all")}</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
        <div className="h-[calc(100%-10.75rem)] overflow-auto">
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

      <main className="flex min-w-0 flex-col bg-background">
        {draft ? (
          <>
            <div className="border-b border-border bg-card p-6">
              <input
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                className="w-full border-0 bg-transparent text-xl font-semibold tracking-normal text-foreground outline-none placeholder:text-muted-foreground"
                placeholder={t("memo.title.placeholder")}
              />
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <select
                  value={draft.groupId}
                  onChange={(event) => setDraft({ ...draft, groupId: Number(event.target.value) })}
                  className="rounded-sm border border-input bg-transparent px-2 py-1 outline-none transition-all duration-150 hover:border-ring focus:border-ring focus:ring-[3px] focus:ring-primary/10"
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
                  className="rounded-sm border border-input bg-transparent px-2 py-1 outline-none transition-all duration-150 hover:border-ring focus:border-ring focus:ring-[3px] focus:ring-primary/10"
                >
                  <option value="normal">{t("memo.status.normal")}</option>
                  <option value="todo">{t("memo.status.todo")}</option>
                  <option value="done">{t("memo.status.done")}</option>
                </select>
                <span>{t("memo.updatedAt", { time: formatDate(draft.updateTime) })}</span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-1 rounded-md border border-border bg-background p-1">
                <ToolbarButton title="Bold" onClick={() => applyInlineFormat("bold", "**", "**", "加粗文本")}><Bold className="h-3.5 w-3.5" /></ToolbarButton>
                <ToolbarButton title="Italic" onClick={() => applyInlineFormat("italic", "*", "*", "斜体文本")}><Italic className="h-3.5 w-3.5" /></ToolbarButton>
                <ToolbarButton title="Strike" onClick={() => applyInlineFormat("strikeThrough", "~~", "~~", "删除线文本")}><Strikethrough className="h-3.5 w-3.5" /></ToolbarButton>
                <ToolbarSeparator />
                <ToolbarButton title="Heading" onClick={() => applyBlockFormat("formatBlock", "# 标题", "h1")}><Heading1 className="h-3.5 w-3.5" /></ToolbarButton>
                <ToolbarButton title="List" onClick={() => applyBlockFormat("insertUnorderedList", "- 列表项")}><List className="h-3.5 w-3.5" /></ToolbarButton>
                <ToolbarButton title="Ordered list" onClick={() => applyBlockFormat("insertOrderedList", "1. 列表项")}><ListOrdered className="h-3.5 w-3.5" /></ToolbarButton>
                <ToolbarButton title="Todo" onClick={() => editorMode === "visual" ? insertVisualHtml('<p><input type="checkbox" disabled /> 待办事项</p>') : insertBlock("- [ ] 待办事项")}><CheckSquare className="h-3.5 w-3.5" /></ToolbarButton>
                <ToolbarSeparator />
                <ToolbarButton title="Quote" onClick={() => editorMode === "visual" ? insertVisualHtml("<blockquote>引用内容</blockquote>") : insertBlock("> 引用内容")}><Quote className="h-3.5 w-3.5" /></ToolbarButton>
                <ToolbarButton title="Code" onClick={() => editorMode === "visual" ? insertVisualHtml("<pre><code>代码</code></pre>") : insertBlock("```\n代码\n```")}><Code className="h-3.5 w-3.5" /></ToolbarButton>
                <ToolbarButton title="Link" onClick={insertLink}><Link className="h-3.5 w-3.5" /></ToolbarButton>
                <ToolbarButton title="Image" onClick={chooseImage}><Image className="h-3.5 w-3.5" /></ToolbarButton>
                <ToolbarSeparator />
                <ToolbarButton title="Line" onClick={() => editorMode === "visual" ? insertVisualHtml("<hr />") : insertBlock("---")}><Minus className="h-3.5 w-3.5" /></ToolbarButton>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    handleImageSelected(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
                <div className="ml-auto flex gap-0.5 rounded-sm bg-muted p-0.5">
                  <button
                    onClick={() => setEditorMode("visual")}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-sm px-3 py-1.5 text-[11px] transition-colors hover:text-foreground",
                      editorMode === "visual" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                    )}
                  >
                    <FileText className="h-3 w-3" />
                    {t("memo.editor.visual")}
                  </button>
                  <button
                    onClick={() => setEditorMode("markdown")}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-sm px-3 py-1.5 text-[11px] transition-colors hover:text-foreground",
                      editorMode === "markdown" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                    )}
                  >
                    <FileCode2 className="h-3 w-3" />
                    {t("memo.editor.markdown")}
                  </button>
                </div>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-6">
              {editorMode === "markdown" ? (
                <textarea
                  ref={textareaRef}
                  value={draft.content}
                  onChange={(event) => setDraft({ ...draft, content: event.target.value })}
                  className="h-full w-full resize-none rounded-md border border-input bg-background p-4 font-mono text-sm leading-7 text-foreground outline-none transition-all duration-150 placeholder:text-muted-foreground focus:border-ring focus:ring-[3px] focus:ring-primary/10"
                  placeholder={t("memo.editor.placeholder")}
                />
              ) : (
                <div
                  ref={visualEditorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={syncVisualEditor}
                  className="memo-rich-editor h-full overflow-auto rounded-md border border-input bg-card p-5 text-sm leading-7 text-foreground outline-none transition-all duration-150 focus:border-ring focus:ring-[3px] focus:ring-primary/10"
                  data-placeholder={t("memo.editor.placeholder")}
                />
              )}
            </div>
            <div className="flex h-[52px] items-center justify-between border-t border-border bg-card px-4 py-2">
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{t("memo.editor.saved")}</span>
                {error && <span className="text-destructive">{error}</span>}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => toggleArchive(draft.id)} disabled={isSaving}>
                  <Archive />
                  {t("memo.action.archive")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleFavorite(draft.id)} disabled={isSaving}>
                  <Star className={cn(draft.isFavorite && "fill-primary text-primary")} />
                  {t("memo.action.favorite")}
                </Button>
                <Button size="sm" onClick={saveDraft} disabled={isSaving}>
                  <Save />
                  {t("memo.action.save")}
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

function ToolbarButton({
  active,
  title,
  children,
  onClick,
}: {
  active?: boolean;
  title: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        active && "bg-primary/10 text-primary"
      )}
    >
      {children}
    </button>
  );
}

function ToolbarSeparator() {
  return <div className="mx-1 h-5 w-px bg-border" />;
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
