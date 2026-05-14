//! UniComm Desktop Library
//!
//! UniComm 企业桌面协作平台的 Tauri 核心库。
//!
//! 提供与 React 前端交互的 Rust 命令：
//! - `get_current_windows_user`: 获取 Windows 用户信息
//! - `get_device_info`: 获取设备信息
//!
//! 这些命令用于桌面端认证流程（Phase 1）。
//!
//! # 架构说明
//!
//! UniComm 桌面端采用 Tauri 2 + React 架构：
//! - **Rust (Tauri)**: 负责系统级操作（读取 Windows 用户、设备信息）
//! - **React (TypeScript)**: 负责 UI 和业务逻辑
//!
//! 前端不直接调用 Tauri 命令，而是通过 Desktop Adapter Layer 封装：
//! - `src/desktop/user/getCurrentWindowsUser.ts`
//! - `src/desktop/device/DeviceService.ts`
//!
//! # 认证流程
//!
//! ```text
//! React 前端
//!     │
//!     ▼ (通过 adapter 调用)
//! Rust Tauri 命令
//!     │
//!     ├── get_current_windows_user() → WindowsUserInfo
//!     └── get_device_info() → DeviceInfo
//!     │
//!     ▼ (组合后调用后端)
//! POST /api/v1/auth/desktop/verify
//! ```

pub mod commands;

/// 注册并暴露 Tauri 命令
///
/// 暴露以下命令给前端调用：
/// - `get_current_windows_user`: 获取当前 Windows 用户信息
/// - `get_device_info`: 获取当前设备信息
pub use commands::{get_current_windows_user, get_device_info};

/// 运行 Tauri 应用
///
/// 初始化 Tauri Builder，注册命令和插件，
/// 然后启动应用程序。
///
/// # Panics
///
/// 如果 Tauri 应用启动失败（例如配置错误、端口被占用），则 panic。
fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_current_windows_user,
            get_device_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}