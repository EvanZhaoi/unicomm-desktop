use serde::Serialize;

#[derive(Serialize)]
pub struct DeviceInfo {
    pub device_id: String,
    pub computer_name: String,
    pub os: String,
    pub os_version: String,
    pub app_version: String,
}

#[tauri::command]
pub fn get_device_info() -> Result<DeviceInfo, String> {
    Ok(DeviceInfo {
        device_id: whoami::devicename(),
        computer_name: whoami::devicename(),
        os: std::env::consts::OS.to_string(),
        os_version: whoami::os_version().to_string(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
    })
}