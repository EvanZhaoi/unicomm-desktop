import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const host = process.env.TAURI_DEV_HOST;

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
    // Milkdown 和 Mermaid 内部依赖关系比较密，强行按包名拆分会制造 Rollup circular chunk 警告。
    // 编辑器组件本身已经通过 React.lazy 懒加载，这里交给 Rollup 保持依赖闭包。
    chunkSizeWarningLimit: 1800,
  },
});
