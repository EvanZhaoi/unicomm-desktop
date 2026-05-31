import { useSocketStore } from "@/stores/socket.store";

export interface RealtimeEvent {
  module: string;
  type: string;
  ownerUsername?: string;
  memoId?: number | null;
  groupId?: number | null;
  occurredAt?: string;
}

type RealtimeListener = (event: RealtimeEvent) => void;

function resolveWsUrl(): string {
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
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private shouldReconnect = false;
  private readonly listeners = new Set<RealtimeListener>();

  connect() {
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
      if (message.data === "pong") {
        return;
      }

      try {
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
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
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
