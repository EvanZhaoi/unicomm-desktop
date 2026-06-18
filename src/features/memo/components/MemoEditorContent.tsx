import { lazy, Suspense } from "react";
import { FileText } from "lucide-react";
import { Textarea } from "@/components/ui";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/utils/cn";
import type { MemoEditorMode } from "./MemoEditorHeader";
import { MemoEmptyState } from "./MemoEmptyState";

const MemoRichEditor = lazy(() => import("./MemoRichEditor"));

interface MemoEditorContentProps {
  memoId: number;
  editorMode: MemoEditorMode;
  visualContent: string;
  markdownContent: string;
  canEdit: boolean;
  onVisualChange: (content: string) => void;
  onMarkdownChange: (content: string) => void;
}

/**
 * Composes the lazy Milkdown editor and Markdown source editor.
 * Draft ownership and preview synchronization stay in MemoWorkspace, while
 * this component owns responsive editor layout and mode-specific read-only rules.
 */
export function MemoEditorContent({
  memoId,
  editorMode,
  visualContent,
  markdownContent,
  canEdit,
  onVisualChange,
  onMarkdownChange,
}: MemoEditorContentProps) {
  const { t } = useI18n();

  return (
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
          <Suspense
            fallback={<MemoEmptyState icon={<FileText className="h-5 w-5" />} title={t("memo.loading")} />}
          >
            <MemoRichEditor
              key={memoId}
              value={visualContent}
              placeholder={t("memo.editor.placeholder")}
              readOnly={editorMode === "split" || !canEdit}
              onChange={editorMode === "split" ? () => undefined : onVisualChange}
            />
          </Suspense>
        )}
        {editorMode !== "visual" && (
          <section className="flex min-h-0 flex-col overflow-hidden rounded-md border border-input bg-background">
            <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3 text-xs font-medium text-muted-foreground">
              <span>{t("memo.editor.markdown")}</span>
            </div>
            <Textarea
              value={markdownContent}
              onChange={(event) => onMarkdownChange(event.target.value)}
              readOnly={!canEdit}
              className="min-h-0 flex-1 resize-none rounded-none border-0 bg-background font-mono leading-7 shadow-none focus-visible:border-transparent focus-visible:ring-0"
              placeholder={t("memo.editor.placeholder")}
            />
          </section>
        )}
      </div>
    </div>
  );
}
