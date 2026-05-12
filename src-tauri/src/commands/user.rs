use serde::Serialize;

#[derive(Serialize)]
pub struct WindowsUserInfo {
    pub username: String,
    pub domain: Option<String>,
    pub computer_name: String,
    pub os: String,
    pub os_version: String,
}

#[tauri::command]
pub fn get_current_windows_user() -> Result<WindowsUserInfo, String> {
    Ok(WindowsUserInfo {
        username: whoami::username(),
        domain: None,
        computer_name: whoami::devicename(),
        os: std::env::consts::OS.to_string(),
        os_version: whoami::os_version().to_string(),
    })
}