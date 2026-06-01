//! Windows 用户信息相关命令模块
//!
//! 提供获取当前 Windows 登录用户信息的功能。

use serde::Serialize;

/// 读取当前 Windows 登录域。
///
/// 企业域环境通常会提供 `USERDOMAIN` 或 `USERDNSDOMAIN`。
/// 当用户是本机账户时，`USERDOMAIN` 可能等于计算机名；这种情况不作为域名返回，
/// 避免认证请求把本机名误认为 AD 域。
fn read_windows_domain(computer_name: &str) -> Option<String> {
    ["USERDOMAIN", "USERDNSDOMAIN"]
        .iter()
        .filter_map(|key| std::env::var(key).ok())
        .map(|value| value.trim().to_string())
        .find(|value| !value.is_empty() && value != computer_name)
}

/// Windows 用户信息结构
///
/// 包含当前 Windows 登录用户的身份信息。
/// 这些信息用于 UniComm 桌面端认证流程。
///
/// # 字段说明
///
/// - `username`: Windows 用户名
/// - `domain`: Windows 域（可选，AD 环境可能为 Some）
/// - `computer_name`: 计算机名称
/// - `os`: 操作系统类型（如 "windows"、"macos"、"linux"）
/// - `os_version`: 操作系统版本字符串
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowsUserInfo {
    /// Windows 用户名
    pub username: String,
    /// Windows 域信息（AD 环境可能为 Some）
    pub domain: Option<String>,
    /// 计算机名称
    pub computer_name: String,
    /// 操作系统类型
    pub os: String,
    /// 操作系统版本
    pub os_version: String,
}

/// 获取当前 Windows 用户信息
///
/// 通过 Tauri 命令暴露给前端调用。
/// 使用 `whoami` crate 获取当前登录用户的身份信息。
///
/// # 认证流程
///
/// 此命令在 UniComm 桌面端认证流程的第一步调用：
/// 1. 调用此命令获取 Windows 用户信息
/// 2. 结合设备信息组成 `DesktopVerifyRequest`
/// 3. 调用后端 `/api/v1/auth/desktop/verify` 接口进行认证
///
/// # 返回值
///
/// 成功返回 `WindowsUserInfo`，包含当前用户的身份信息。
/// 失败返回错误字符串。
///
/// # 示例
///
/// ```rust,ignore
/// let user_info = get_current_windows_user()?;
/// println!("User: {}, Domain: {:?}", user_info.username, user_info.domain);
/// ```
#[tauri::command]
pub fn get_current_windows_user() -> Result<WindowsUserInfo, String> {
    let computer_name = whoami::devicename();

    Ok(WindowsUserInfo {
        username: whoami::username(),
        domain: read_windows_domain(&computer_name),
        computer_name,
        os: std::env::consts::OS.to_string(),
        os_version: whoami::distro(),
    })
}
