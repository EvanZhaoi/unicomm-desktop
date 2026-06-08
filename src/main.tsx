/**
 * 入口文件
 * 
 * UniComm Desktop 应用的 React 入口点。
 * 负责初始化 React 根节点并渲染 App 组件。
 * 
 * ## 职责
 * 1. 获取 DOM 中的 `#root` 容器
 * 2. 使用 `createRoot` 创建 React 18 的并发根节点
 * 3. 渲染 App 组件
 *
 * ## 桌面端副作用说明
 * Tauri 命令、全局快捷键和事件监听都是真实桌面副作用。
 * React StrictMode 会在开发环境重复执行挂载副作用，容易让网络面板出现重复请求，
 * 也可能重复注册桌面监听；这里保持单次挂载，避免调试体验和桌面行为产生偏差。
 * 
 * ## 入口文件流程
 * ```
 * main.tsx 执行
 *   → 导入 globals.css（全局样式）
 *   → 导入 App 组件
 *   → createRoot(document.getElementById('root')!)
 *   → render(<App />)
 * ```
 * 
 * @module main
 */

import { createRoot } from "react-dom/client";
// Milkdown Crepe 提供富文本编辑器基础样式；globals.css 会继续覆盖主题变量。
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";
// 导入全局样式（Tailwind CSS 和应用主题等）
import "./styles/globals.css";
// 导入根组件
import App from "./App";

/**
 * 渲染入口
 * 
 * 获取 DOM 容器并挂载 React 应用。
 * 桌面端直接渲染 App，避免开发环境重复执行 Tauri 副作用。
 */
createRoot(document.getElementById("root")!).render(<App />);
