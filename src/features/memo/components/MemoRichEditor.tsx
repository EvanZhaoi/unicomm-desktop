import { useEffect, useRef, type MouseEvent } from "react";
import { Crepe } from "@milkdown/crepe";

/**
 * 现阶段图片直接以 data URL 写入 Markdown，确保不依赖服务端也能保存和回显。
 * 后续接入文件上传接口时，只需要把 Crepe 的上传回调替换为 upload(file) -> url。
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Unsupported image result"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

interface MemoRichEditorProps {
  value: string;
  placeholder: string;
  readOnly?: boolean;
  onChange: (value: string) => void;
}

export default function MemoRichEditor({ value, placeholder, readOnly = false, onChange }: MemoRichEditorProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const onChangeRef = useRef(onChange);

  const focusProseMirror = () => {
    rootRef.current?.querySelector<HTMLElement>(".ProseMirror")?.focus();
  };

  const focusEditorFromBlankArea = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;

    if (target.closest("button, input, textarea, select, a, [contenteditable='true'], .milkdown-top-bar")) {
      return;
    }

    // Milkdown 的可编辑节点只覆盖有内容的区域，外层空白点击需要手动转交焦点。
    window.requestAnimationFrame(focusProseMirror);
  };

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!rootRef.current) {
      return;
    }

    /**
     * Crepe 内部基于 ProseMirror 管理编辑状态。
     * 这里默认打开 Crepe 的完整编辑体验（TopBar、表格、代码块、公式等），只关闭需要服务端能力的 AI。
     */
    const applyReadonly = () => {
      rootRef.current?.querySelector<HTMLElement>(".ProseMirror")?.setAttribute("contenteditable", readOnly ? "false" : "true");
    };

    const editor = new Crepe({
      root: rootRef.current,
      defaultValue: value,
      features: {
        [Crepe.Feature.TopBar]: true,
        [Crepe.Feature.AI]: false,
      },
      featureConfigs: {
        [Crepe.Feature.Placeholder]: {
          text: placeholder,
          mode: "block",
        },
        [Crepe.Feature.ImageBlock]: {
          onUpload: fileToDataUrl,
          inlineOnUpload: fileToDataUrl,
          blockOnUpload: fileToDataUrl,
          maxWidth: 960,
        },
      },
    }).on((listener) => {
      listener.markdownUpdated((_, markdown) => {
        if (readOnly) {
          return;
        }
        onChangeRef.current(markdown);
      });
    });

    void editor.create().then(applyReadonly);

    return () => {
      void editor.destroy();
    };
  }, [placeholder, readOnly]);

  return (
    <div
      className="memo-crepe-editor h-full min-h-0 cursor-text overflow-y-auto rounded-md border border-input bg-card text-sm leading-7 text-foreground outline-none transition-all duration-150 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-primary/10"
      onMouseDown={focusEditorFromBlankArea}
    >
      <div ref={rootRef} />
    </div>
  );
}
