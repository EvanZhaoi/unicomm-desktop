/**
 * 入口文件
 * 
 * UniComm Desktop 应用的 React 入口点。
 * 负责初始化 React 根节点并渲染 App 组件。
 * 
 * ## 职责
 * 1. 获取 DOM 中的 `#root` 容器
 * 2. 使用 `createRoot` 创建 React 18 的并发根节点
 * 3. 渲染 App 组件（外层包裹 StrictMode）
 * 
 * ## StrictMode 说明
 * React StrictMode 在开发环境下会：
 * - 双重调用组件渲染（检测副作用问题）
 * - 檢測不安全的生命周期方法
 * - 检测意外的副作用
 * 生产环境会自动禁用这些检查。
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

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// 导入全局样式（Tailwind CSS 等）
import "./styles/globals.css";
// 导入根组件
import App from "./App";

/**
 * 渲染入口
 * 
 * 获取 DOM 容器并挂载 React 应用。
 * 使用 StrictMode 包裹以启用开发环境检查。
 */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);