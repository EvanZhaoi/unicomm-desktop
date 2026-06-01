import { useEffect, useRef } from "react";
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
  onChange: (value: string) => void;
}

export default function MemoRichEditor({ value, placeholder, onChange }: MemoRichEditorProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!rootRef.current) {
      return;
    }

    /**
     * Crepe 内部基于 ProseMirror 管理编辑状态。
     * value 只作为初始 Markdown 内容使用，父组件会在切换 Memo 或切换视图时通过 key 重新挂载编辑器，
     * 因此这里不把 value 放进依赖，避免用户每次输入都触发编辑器重建。
     */
    const editor = new Crepe({
      root: rootRef.current,
      defaultValue: value,
      features: {
        [Crepe.Feature.AI]: false,
        [Crepe.Feature.CodeMirror]: false,
        [Crepe.Feature.Latex]: false,
        [Crepe.Feature.Table]: false,
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
        onChangeRef.current(markdown);
      });
    });

    void editor.create();

    return () => {
      void editor.destroy();
    };
  }, [placeholder]);

  return (
    <div className="memo-crepe-editor h-full overflow-auto rounded-md border border-input bg-card text-sm leading-7 text-foreground outline-none transition-all duration-150 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-primary/10">
      <div ref={rootRef} />
    </div>
  );
}
