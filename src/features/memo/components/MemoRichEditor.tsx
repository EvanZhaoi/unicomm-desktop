import { useEffect, useRef, type MouseEvent } from "react";
import { Crepe } from "@milkdown/crepe";
import { diagram } from "@milkdown/plugin-diagram";
import { replaceAll } from "@milkdown/utils";
import mermaid from "mermaid";

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

let mermaidRenderIndex = 0;

function getMermaidTheme() {
  return document.documentElement.classList.contains("dark") ? "dark" : "default";
}

/**
 * Milkdown 的 diagram 插件负责把 ```mermaid 代码块转换成 diagram 节点。
 * 这里负责把节点中的 Mermaid 源码渲染为 SVG，让可视化编辑区直接展示流程图、甘特图等图形。
 */
async function renderMermaidDiagrams(root: HTMLElement) {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: getMermaidTheme(),
  });

  const diagramNodes = Array.from(root.querySelectorAll<HTMLElement>('[data-type="diagram"]'));
  await Promise.all(
    diagramNodes.map(async (node) => {
      const source = node.dataset.value || node.textContent || "";
      const trimmedSource = source.trim();
      if (!trimmedSource || node.dataset.renderedMermaid === source) {
        return;
      }

      node.classList.add("memo-mermaid-diagram");
      node.dataset.renderedMermaid = source;
      node.innerHTML = `<div class="memo-mermaid-loading">Rendering diagram...</div>`;

      try {
        const id = `memo-mermaid-${Date.now()}-${mermaidRenderIndex++}`;
        const { svg } = await mermaid.render(id, trimmedSource);
        node.innerHTML = svg;
      } catch (error) {
        node.classList.add("memo-mermaid-diagram-error");
        node.innerHTML = `<pre>${escapeHtml(error instanceof Error ? error.message : "Invalid Mermaid diagram")}</pre>`;
      }
    })
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface MemoRichEditorProps {
  value: string;
  placeholder: string;
  readOnly?: boolean;
  onChange: (value: string) => void;
}

export default function MemoRichEditor({ value, placeholder, readOnly = false, onChange }: MemoRichEditorProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<Crepe | null>(null);
  const currentMarkdownRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const diagramRenderTimerRef = useRef<number | null>(null);
  const suppressProgrammaticChangeRef = useRef(false);
  const ignoreInitialMarkdownUpdateRef = useRef(true);

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

    ignoreInitialMarkdownUpdateRef.current = true;
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
    });

    editor.editor.use(diagram);

    const scheduleDiagramRender = () => {
      if (diagramRenderTimerRef.current) {
        window.clearTimeout(diagramRenderTimerRef.current);
      }
      diagramRenderTimerRef.current = window.setTimeout(() => {
        diagramRenderTimerRef.current = null;
        if (rootRef.current) {
          void renderMermaidDiagrams(rootRef.current);
        }
      }, 120);
    };

    editor.on((listener) => {
      listener.markdownUpdated((_, markdown) => {
        if (ignoreInitialMarkdownUpdateRef.current) {
          ignoreInitialMarkdownUpdateRef.current = false;
          currentMarkdownRef.current = markdown;
          scheduleDiagramRender();
          return;
        }

        if (suppressProgrammaticChangeRef.current) {
          scheduleDiagramRender();
          return;
        }

        currentMarkdownRef.current = markdown;
        scheduleDiagramRender();
        if (readOnly) {
          return;
        }
        onChangeRef.current(markdown);
      });
    });

    const observer = new MutationObserver(scheduleDiagramRender);

    void editor.create().then(() => {
      editorRef.current = editor;
      applyReadonly();
      scheduleDiagramRender();
      if (rootRef.current) {
        observer.observe(rootRef.current, {
          attributes: true,
          childList: true,
          subtree: true,
        });
      }
    });

    return () => {
      observer.disconnect();
      if (diagramRenderTimerRef.current) {
        window.clearTimeout(diagramRenderTimerRef.current);
        diagramRenderTimerRef.current = null;
      }
      editorRef.current = null;
      void editor.destroy();
    };
  }, [placeholder, readOnly]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || value === currentMarkdownRef.current) {
      return;
    }

    currentMarkdownRef.current = value;
    suppressProgrammaticChangeRef.current = true;
    editor.editor.action(replaceAll(value));
    window.setTimeout(() => {
      suppressProgrammaticChangeRef.current = false;
    }, 0);

    if (diagramRenderTimerRef.current) {
      window.clearTimeout(diagramRenderTimerRef.current);
    }
    diagramRenderTimerRef.current = window.setTimeout(() => {
      diagramRenderTimerRef.current = null;
      if (rootRef.current) {
        void renderMermaidDiagrams(rootRef.current);
      }
    }, 120);
  }, [value]);

  return (
    <div
      className="memo-crepe-editor h-full min-h-0 cursor-text overflow-y-auto rounded-md border border-input bg-card text-sm leading-7 text-foreground outline-none transition-all duration-150 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-primary/10"
      onMouseDown={focusEditorFromBlankArea}
    >
      <div ref={rootRef} />
    </div>
  );
}
