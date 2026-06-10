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
//!
//! 主窗口关闭了系统原生标题栏，由 React 的 `AppLayout.Titlebar` 绘制自定义标题栏。
//! 快速 Memo 窗口仍使用系统标题栏，保持轻量窗口的原生关闭/移动体验。

pub mod commands;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    webview::WebviewWindowBuilder,
    AppHandle, Manager, RunEvent, WebviewUrl, WindowEvent,
};
#[cfg(windows)]
use tauri::Emitter;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutEvent, ShortcutState};
#[cfg(not(windows))]
use tauri_plugin_notification::NotificationExt;
#[cfg(windows)]
use tauri_winrt_notification::{Duration, Toast};

/// 注册并暴露 Tauri 命令
///
/// 暴露以下命令给前端调用：
/// - `get_current_windows_user`: 获取当前 Windows 用户信息
/// - `get_device_info`: 获取当前设备信息
pub use commands::{get_current_windows_user, get_device_info};

const MAIN_WINDOW_LABEL: &str = "main";
const QUICK_MEMO_WINDOW_LABEL: &str = "quick-memo";
const DEFAULT_MAIN_SHORTCUT: &str = "Ctrl+Alt+M";
const DEFAULT_QUICK_MEMO_SHORTCUT: &str = "Ctrl+Alt+N";
const MENU_SHOW: &str = "show";
const MENU_HIDE: &str = "hide";
const MENU_QUIT: &str = "quit";

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn hide_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        let _ = window.hide();
    }
}

fn show_quick_memo_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(QUICK_MEMO_WINDOW_LABEL) {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.center();
        let _ = window.set_focus();
    }
}

#[cfg(windows)]
fn open_memo_from_notification(app: &AppHandle, memo_id: u64) {
    show_main_window(app);
    let _ = app.emit_to(MAIN_WINDOW_LABEL, "open-memo-from-notification", memo_id);
}

#[cfg(windows)]
fn send_windows_memo_notification(
    app: AppHandle,
    title: &str,
    body: &str,
    memo_id: Option<u64>,
) -> Result<(), String> {
    // Tauri dev 环境通常没有注册 AppUserModelID；用 PowerShell 兼容 ID 可以保证本地调试时 toast 能弹出并触发点击回调。
    let app_id = if cfg!(dev) {
        Toast::POWERSHELL_APP_ID.to_string()
    } else {
        app.config().identifier.clone()
    };
    let app_for_click = app.clone();
    let memo_id_for_click = memo_id;
    let toast = Toast::new(&app_id)
        .title(title)
        .text1(body)
        .duration(Duration::Short)
        .on_activated(move |_| {
            if let Some(memo_id) = memo_id_for_click {
                open_memo_from_notification(&app_for_click, memo_id);
            } else {
                show_main_window(&app_for_click);
            }
            Ok(())
        });

    toast.show().or_else(|_| {
        let app_for_click = app.clone();
        Toast::new(Toast::POWERSHELL_APP_ID)
            .title(title)
            .text1(body)
            .duration(Duration::Short)
            .on_activated(move |_| {
                if let Some(memo_id) = memo_id {
                    open_memo_from_notification(&app_for_click, memo_id);
                } else {
                    show_main_window(&app_for_click);
                }
                Ok(())
            })
            .show()
    })
    .map_err(|error| error.to_string())
}

#[cfg(not(windows))]
fn send_windows_memo_notification(
    app: AppHandle,
    title: &str,
    body: &str,
    memo_id: Option<u64>,
) -> Result<(), String> {
    let mut notification = app.notification().builder().title(title).body(body);
    if let Some(memo_id) = memo_id {
        notification = notification.extra("memoId", memo_id);
    }
    notification
        .show()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn send_memo_notification(
    app: AppHandle,
    title: String,
    body: String,
    memo_id: Option<u64>,
) -> Result<(), String> {
    send_windows_memo_notification(app, &title, &body, memo_id)
}

#[tauri::command]
fn hide_quick_memo(app: AppHandle) {
    if let Some(window) = app.get_webview_window(QUICK_MEMO_WINDOW_LABEL) {
        let _ = window.hide();
    }
}

fn handle_main_shortcut(app: &AppHandle, event: ShortcutEvent) {
    if event.state == ShortcutState::Pressed {
        show_main_window(app);
    }
}

fn handle_quick_memo_shortcut(app: &AppHandle, event: ShortcutEvent) {
    if event.state == ShortcutState::Pressed {
        show_quick_memo_window(app);
    }
}

fn register_global_shortcuts(
    app: &AppHandle,
    main_shortcut: &str,
    quick_memo_shortcut: &str,
) -> Result<(), String> {
    let main_shortcut = main_shortcut.trim();
    let quick_memo_shortcut = quick_memo_shortcut.trim();

    if main_shortcut.is_empty() || quick_memo_shortcut.is_empty() {
        return Err("快捷键不能为空".to_string());
    }

    if main_shortcut.eq_ignore_ascii_case(quick_memo_shortcut) {
        return Err("两个快捷键不能相同".to_string());
    }

    let shortcuts = app.global_shortcut();
    shortcuts
        .unregister_all()
        .map_err(|error| error.to_string())?;
    shortcuts
        .on_shortcut(main_shortcut, |app, _shortcut, event| {
            handle_main_shortcut(app, event);
        })
        .map_err(|error| error.to_string())?;
    shortcuts
        .on_shortcut(quick_memo_shortcut, |app, _shortcut, event| {
            handle_quick_memo_shortcut(app, event);
        })
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
fn configure_global_shortcuts(
    app: AppHandle,
    main_shortcut: String,
    quick_memo_shortcut: String,
) -> Result<(), String> {
    register_global_shortcuts(&app, &main_shortcut, &quick_memo_shortcut)
}

fn setup_quick_memo_window(app: &mut tauri::App) -> tauri::Result<()> {
    if app.get_webview_window(QUICK_MEMO_WINDOW_LABEL).is_some() {
        return Ok(());
    }

    WebviewWindowBuilder::new(
        app,
        QUICK_MEMO_WINDOW_LABEL,
        WebviewUrl::App("index.html".into()),
    )
    .title("快速 Memo")
    .inner_size(520.0, 420.0)
    .min_inner_size(420.0, 340.0)
    .resizable(true)
    .decorations(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .visible(false)
    .center()
    .build()?;

    Ok(())
}

fn setup_tray(app: &mut tauri::App) -> tauri::Result<()> {
    let show_item = MenuItem::with_id(app, MENU_SHOW, "显示 UniComm", true, None::<&str>)?;
    let hide_item = MenuItem::with_id(app, MENU_HIDE, "隐藏到后台", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, MENU_QUIT, "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_item, &hide_item, &quit_item])?;

    let mut tray = TrayIconBuilder::new()
        .tooltip("UniComm")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            MENU_SHOW => show_main_window(app),
            MENU_HIDE => hide_main_window(app),
            MENU_QUIT => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| match event {
            TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            }
            | TrayIconEvent::DoubleClick {
                button: MouseButton::Left,
                ..
            } => show_main_window(tray.app_handle()),
            _ => {}
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        tray = tray.icon(icon);
    }

    tray.build(app)?;
    Ok(())
}

/// 运行 Tauri 应用
///
/// 初始化 Tauri Builder，注册命令和插件，
/// 然后启动应用程序。
///
/// # Panics
///
/// 如果 Tauri 应用启动失败（例如配置错误、端口被占用），则 panic。
pub fn run() {
    let global_shortcut = tauri_plugin_global_shortcut::Builder::new().build();

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(global_shortcut)
        .setup(|app| {
            setup_tray(app)?;
            setup_quick_memo_window(app)?;
            register_global_shortcuts(
                app.app_handle(),
                DEFAULT_MAIN_SHORTCUT,
                DEFAULT_QUICK_MEMO_SHORTCUT,
            )
            .map_err(|error| -> Box<dyn std::error::Error> { error.into() })?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_current_windows_user,
            get_device_info,
            configure_global_shortcuts,
            hide_quick_memo,
            send_memo_notification,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app, event| {
        if let RunEvent::WindowEvent {
            label,
            event: WindowEvent::CloseRequested { api, .. },
            ..
        } = event
        {
            if label == MAIN_WINDOW_LABEL || label == QUICK_MEMO_WINDOW_LABEL {
                api.prevent_close();
                if label == MAIN_WINDOW_LABEL {
                    hide_main_window(app);
                } else if let Some(window) = app.get_webview_window(QUICK_MEMO_WINDOW_LABEL) {
                    let _ = window.hide();
                }
            }
        }
    });
}
