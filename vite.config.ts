import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const host = process.env.TAURI_DEV_HOST;

function editorChunk(id: string) {
  if (id.includes("/node_modules/@milkdown/crepe")) {
    return "vendor-milkdown-crepe";
  }
  if (id.includes("/node_modules/@milkdown/components")) {
    return "vendor-milkdown-components";
  }
  if (
    id.includes("/node_modules/@milkdown/core") ||
    id.includes("/node_modules/@milkdown/ctx") ||
    id.includes("/node_modules/@milkdown/prose") ||
    id.includes("/node_modules/@milkdown/transformer") ||
    id.includes("/node_modules/@milkdown/utils") ||
    id.includes("/node_modules/@milkdown/exception")
  ) {
    return "vendor-milkdown-core";
  }
  if (id.includes("/node_modules/@milkdown/preset-")) {
    return "vendor-milkdown-preset";
  }
  if (id.includes("/node_modules/@milkdown/plugin-") || id.includes("/node_modules/@milkdown-lab/")) {
    return "vendor-milkdown-plugin";
  }
  if (id.includes("/node_modules/prosemirror-") || id.includes("/node_modules/@prosemirror/")) {
    return "vendor-prosemirror";
  }
  if (id.includes("/node_modules/katex/")) {
    return "vendor-katex";
  }
  return undefined;
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          return editorChunk(id);
        },
      },
    },
  },
});
