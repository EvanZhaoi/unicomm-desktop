# UniComm Desktop

Tauri 2 + React 19 企业协同桌面应用

## 技术栈

- **Tauri 2.x** - Rust 后端桌面框架
- **React 19.x** - UI 框架
- **Vite 6.x** - 构建工具
- **TypeScript 5.x** - 类型安全
- **TailwindCSS 4.x** - 原子化 CSS
- **Zustand 5.x** - 状态管理
- **TanStack Query 5.x** - 服务端状态
- **React Router 7.x** - 路由
- **Alibaba PuHuiTi 3.0** - 中日文界面首选字体

## 项目结构

```
unicomm-desktop/
├── src/                      # React 前端源码
│   ├── desktop/              # 桌面能力层 (Tauri 封装)
│   ├── native/               # Native 抽象层
│   ├── features/             # 功能模块 (领域驱动)
│   │   ├── auth/             # 认证模块
│   │   ├── memo/             # 备忘录模块
│   │   └── settings/         # 设置模块
│   ├── i18n/                  # 中日文国际化文案
│   ├── assets/fonts/          # 内置字体文件
│   ├── stores/               # 全局状态
│   ├── components/          # 公共组件
│   ├── services/             # 服务层
│   └── styles/               # 样式
├── src-tauri/                # Tauri/Rust 后端
│   └── src/commands/         # Rust 命令
└── package.json
```

## 开发

### 前置要求

- Node.js 20+
- Rust 1.70+
- npm

### 安装依赖

```bash
cd ~/Project/unicomm-desktop
npm install
```

### 开发模式

```bash
# 启动 Vite 前端开发服务器
npm run dev

# 在另一个终端启动 Tauri
npm run tauri dev
```

### 生产构建

```bash
npm run tauri build
```

## 功能状态

### 已实现 ✅
- [x] Tauri 2 项目初始化
- [x] React 19 + TypeScript 配置
- [x] TailwindCSS 4 主题系统 (light/dark/system)
- [x] 桌面用户信息读取 (Rust whoami)
- [x] 设备信息获取
- [x] 认证状态管理 (Zustand)
- [x] 认证状态视图组件
- [x] HTTP 请求服务 (Axios)
- [x] 基础布局 (Sidebar + Header)
- [x] shadcn/ui 基础组件
- [x] Memo 工作台
- [x] 快速 Memo 小窗口
- [x] 系统托盘与后台运行
- [x] 全局快捷键
- [x] 设置页快捷键配置
- [x] 中文/日文界面切换
- [x] 阿里巴巴普惠体 3.0 / Alibaba Sans JP 内置字体
- [x] WebSocket 实时连接与 Memo 变更刷新

### 开发中 🚧
- [ ] 通知
- [ ] 剪贴板

## 字体与语言

- 默认语言：中文 (`zh-CN`)
- 可选语言：中文 (`zh-CN`) / 日文 (`ja-JP`)
- 设置位置：主界面侧边栏 `设置` -> `语言与字体`
- 中文首选字体：阿里巴巴普惠体 3.0
- 日文首选字体：Alibaba Sans JP
- 字体文件目录：`src/assets/fonts/`
- 首次启动时根据系统语言选择默认语言：`zh-*` 使用中文，`ja-*` 使用日文，未支持语言回退中文
- 用户在设置页手动切换语言后，以本地保存的用户设置为准

当前已内置常用 UI 字重：

- `AlibabaPuHuiTi-3-55-Regular.woff2`
- `AlibabaPuHuiTi-3-65-Medium.woff2`
- `AlibabaPuHuiTi-3-85-Bold.woff2`
- `AlibabaSansJP-Regular.woff2`
- `AlibabaSansJP-Medium.woff2`
- `AlibabaSansJP-Bold.woff2`

`src/styles/globals.css` 通过 `@font-face` 加载项目内字体。若字体文件加载失败，会继续回退到对应语言的系统字体。

## WebSocket 实时同步

- 默认地址：根据 `VITE_API_BASE_URL` 自动推导为同源 `/ws`
- 可通过 `VITE_WS_URL` 显式覆盖，例如 `ws://localhost:28080/ws`
- 认证通过后自动连接，断线后自动重连
- 收到 `memo.*` 或 `group.*` 事件后刷新 Memo 数据

## 认证流程

1. 应用启动 → 读取当前系统用户信息
2. 调用 `/api/v1/auth/desktop/verify` 验证用户
3. 根据认证状态显示不同视图
4. 成功后进入主界面

## 备注

- 当前运行在 macOS 环境，Windows API 功能返回模拟数据
- Windows 托盘和全局快捷键仍需在 Windows 真机上做最终验收
