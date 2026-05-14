//! Tauri 命令模块
//!
//! 提供与前端交互的 Rust 命令，包括：
//! - Windows 用户信息获取
//! - 设备信息获取
//!
//! 这些命令用于 UniComm 桌面端认证流程。

pub mod user;
pub mod device;

pub use user::*;
pub use device::*;