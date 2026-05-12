pub mod commands;

pub use commands::{get_current_windows_user, get_device_info};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_current_windows_user,
            get_device_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}