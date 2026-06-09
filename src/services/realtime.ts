import { useSocketStore } from "@/stores/socket.store";

export interface RealtimeEvent {
  /** 后端模块名，当前 Memo 事件固定为 "memo" */
  module: string;
  /** 事件类型，例如 memo.created、memo.updated、group.deleted */
  type: string;
  /** 事件发起人用户名；前端用于过滤自己触发的通知 */
  ownerUsername?: string;
  /** 本次事件影响的用户；共享 Memo 更新时包含创建者和相关人 */
  recipientUsernames?: string[];
  /** 发生变化的 Memo ID；分组事件可能为空 */
  memoId?: number | null;
  /** 发生变化或受影响的分组 ID */
  groupId?: number | null;
  /** Memo 标题快照，用于即时通知展示 */
  memoTitle?: string | null;
  /** 操作人显示名 */
  actorDisplayName?: string | null;
  /** 内容摘要，避免通知弹框再发起详情查询 */
  contentPreview?: string | null;
  /** 服务端事件生成时间 */
  occurredAt?: string;
}

type RealtimeListener = (event: RealtimeEvent) => void;

function resolveWsUrl(): string {
  /*
   * WebSocket 地址支持两种来源：
   * 1. VITE_WS_URL 显式指定，方便测试环境、反向代理或独立 ws 域名。
   * 2. 从 VITE_API_BASE_URL 推导，把 http/https 转成 ws/wss，并固定路径为 /ws。
   */
  const explicit = (import.meta as { env?: { VITE_WS_URL?: string } }).env?.VITE_WS_URL;
  if (explicit) {
    return explicit;
  }

  const apiBase =
    (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL ||
    "http://localhost:28080/api/v1";
  const url = new URL(apiBase);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  url.search = "";
  return url.toString();
}

class RealtimeService {
  /*
   * RealtimeService 是应用级单例。
   *
   * 约束：
   * - 只在认证通过后连接，避免未登录状态下建立无意义连接。
   * - WebSocket 只做事件通知，真实数据仍通过 Memo HTTP API 拉取。
   * - 网络闪断时自动重连，桌面端没有刷新页面动作，需要连接自己恢复。
   */
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private shouldReconnect = false;
  private readonly listeners = new Set<RealtimeListener>();

  connect() {
    // 防止 React effect 重复触发时创建多个 WebSocket 连接。
    if (this.socket?.readyState === WebSocket.CONNECTING || this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    this.shouldReconnect = true;
    this.clearReconnectTimer();
    useSocketStore.getState().setConnecting(true);

    const socket = new WebSocket(resolveWsUrl());
    this.socket = socket;

    socket.onopen = () => {
      useSocketStore.getState().setConnected(true);
      this.startHeartbeat();
    };

    socket.onmessage = (message) => {
      // 心跳响应只用于维持连接状态，不进入业务事件分发。
      if (message.data === "pong") {
        return;
      }

      try {
        // 后端事件体只描述变化，订阅方收到后自行决定是否刷新当前视图。
        const event = JSON.parse(String(message.data)) as RealtimeEvent;
        this.listeners.forEach((listener) => listener(event));
      } catch (error) {
        console.warn("Invalid realtime message", error);
      }
    };

    socket.onerror = () => {
      useSocketStore.getState().setConnected(false);
    };

    socket.onclose = () => {
      this.stopHeartbeat();
      useSocketStore.getState().setConnected(false);
      this.socket = null;
      if (this.shouldReconnect) {
        // 固定延迟重连足够覆盖当前单后端场景；后续可按需要改成指数退避。
        this.reconnectTimer = window.setTimeout(() => this.connect(), 3000);
      }
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    this.clearReconnectTimer();
    this.stopHeartbeat();
    this.socket?.close();
    this.socket = null;
    useSocketStore.getState().setConnected(false);
  }

  subscribe(listener: RealtimeListener) {
    // 返回取消订阅函数，方便 React useEffect 清理监听器，避免组件卸载后继续刷新状态。
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        // 后端兼容纯文本 ping 和 JSON ping；这里使用最轻量的纯文本心跳。
        this.socket.send("ping");
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

export const realtimeService = new RealtimeService();
