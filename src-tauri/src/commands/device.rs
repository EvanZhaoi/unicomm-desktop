//! 设备信息相关命令模块
//!
//! 提供获取当前设备信息的功能，用于桌面端认证和设备追踪。

use serde::Serialize;

/// 设备信息结构
///
/// 包含当前设备的标识信息，用于：
/// - 桌面端认证流程中的设备识别
/// - 设备信任记录（Phase 2）
/// - 安全审计
///
/// # 字段说明
///
/// - `device_id`: 设备唯一标识（Phase 1 临时使用 computer_name，Phase 2 将使用稳定 UUID）
/// - `computer_name`: 计算机名称
/// - `os`: 操作系统类型
/// - `os_version`: 操作系统版本
/// - `app_version`: UniComm 应用版本（从 Cargo.toml 读取）
#[derive(Serialize)]
pub struct DeviceInfo {
    /// 设备唯一标识
    ///
    /// Phase 1 临时实现：直接使用 computer_name 作为 device_id。
    /// Phase 2 将改为首次启动时生成 UUID 并持久化存储。
    pub device_id: String,
    /// 计算机名称
    pub computer_name: String,
    /// 操作系统类型（如 "windows"、"macos"、"linux"）
    pub os: String,
    /// 操作系统版本
    pub os_version: String,
    /// UniComm 应用版本（从 Cargo.toml 读取）
    pub app_version: String,
}

/// 获取当前设备信息
///
/// 通过 Tauri 命令暴露给前端调用。
/// 获取设备标识信息用于认证和设备管理。
///
/// # 认证流程
///
/// 此命令在 UniComm 桌面端认证流程的第二步调用：
/// 1. 先调用 `get_current_windows_user` 获取用户信息
/// 2. 再调用此命令获取设备信息
/// 3. 组合两者调用后端 `/api/v1/auth/desktop/verify` 接口
///
/// # 设备 ID 说明
///
/// 当前 Phase 1 使用 `computer_name` 作为 `device_id`。
/// 这是临时方案，存在以下问题：
/// - 计算机名改变后 device_id 也会改变
/// - 多设备可能使用相同 computer_name
///
/// Phase 2 将实现：
/// - 首次启动生成 UUID
/// - 存入本地配置文件
/// - 后续启动读取复用
///
/// # 返回值
///
/// 成功返回 `DeviceInfo`，包含当前设备的标识信息。
/// 失败返回错误字符串。
#[tauri::command]
pub fn get_device_info() -> Result<DeviceInfo, String> {
    Ok(DeviceInfo {
        // Phase 1: 临时使用 computer_name 作为 device_id
        // Phase 2: 将改为首次生成 UUID 并持久化
        device_id: whoami::devicename(),
        computer_name: whoami::devicename(),
        os: std::env::consts::OS.to_string(),
        os_version: whoami::os_version().to_string(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
    })
}