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

## 项目结构

```
unicomm-desktop/
├── src/                      # React 前端源码
│   ├── desktop/              # 桌面能力层 (Tauri 封装)
│   ├── native/               # Native 抽象层
│   ├── features/             # 功能模块 (领域驱动)
│   │   ├── auth/             # 认证模块
│   │   └── memo/             # 备忘录模块 (骨架)
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

### 开发中 🚧
- [ ] Memo 备忘录功能
- [ ] 窗口管理
- [ ] 系统托盘
- [ ] 通知
- [ ] 快捷键
- [ ] 剪贴板

## 认证流程

1. 应用启动 → 读取当前系统用户信息
2. 调用 `/api/v1/auth/desktop/verify` 验证用户
3. 根据认证状态显示不同视图
4. 成功后进入主界面

## 备注

- 当前运行在 macOS 环境，Windows API 功能返回模拟数据
- Memo 功能仅骨架，不实现业务逻辑