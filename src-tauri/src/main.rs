//! UniComm Desktop 应用入口
//!
//! Windows 桌面应用程序入口点。
//!
//! # Windows 子系统
//!
//! 在 release 构建时使用 `windows_subsystem = "windows"`，
//! 这样应用不会显示控制台窗口，只显示 GUI 窗口。
//!
//! # 启动流程
//!
//! 1. 入口点 `main()` 调用 `unicomm_desktop_lib::run()`
//! 2. `lib.rs` 中的 `run()` 函数初始化 Tauri 应用
//! 3. 注册 `get_current_windows_user` 和 `get_device_info` 命令
//! 4. 启动 Tauri 应用，进入主事件循环

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// 应用入口函数
///
/// 调用 Rust 库的 run 函数启动 Tauri 应用。
fn main() {
    unicomm_desktop_lib::run();
}