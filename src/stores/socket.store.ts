/**
 * WebSocket 连接状态管理模块 (Zustand Store)
 * 
 * 管理 UniComm Desktop 的 WebSocket 连接状态。
 * WebSocket 用于实现实时功能，如：
 * - 新消息通知
 * - 备忘录同步
 * - 在线状态展示
 * 
 * ## 状态说明
 * - **connected**: WebSocket 连接已建立，可正常通信
 * - **connecting**: 正在建立连接（初始连接或断线重连中）
 * - ** disconnected**: 连接已断开（空闲状态，不在连接中）
 * 
 * ## 使用示例
 * ```typescript
 * import { useSocketStore } from '@/stores/socket.store';
 * 
 * function ConnectionStatus() {
 *   const { connected, connecting } = useSocketStore();
 * 
 *   if (connected) {
 *     return <span>🟢 已连接</span>;
 *   }
 * 
 *   if (connecting) {
 *     return <span>🟡 连接中...</span>;
 *   }
 * 
 *   return <span>🔴 未连接</span>;
 * }
 * ```
 * 
 * @module stores/socket.store
 * @requires zustand
 */

import { create } from 'zustand';

/**
 * WebSocket Store 的状态接口
 */
interface SocketState {
  /** 是否已连接 */
  connected: boolean;
  /** 是否正在连接 */
  connecting: boolean;
  /**
   * 设置连接状态
   * @param connected - 是否已连接
   */
  setConnected: (connected: boolean) => void;
  /**
   * 设置连接中状态
   * @param connecting - 是否正在连接
   */
  setConnecting: (connecting: boolean) => void;
}

/**
 * WebSocket 连接状态管理 Store
 * 
 * 管理 WebSocket 连接的生命周期状态。
 */
export const useSocketStore = create<SocketState>((set) => ({
  // 初始状态：未连接，未连接中
  connected: false,
  connecting: false,

  /**
   * 设置连接状态
   * 
   * 当 WebSocket 连接成功或断开时调用。
   * 设置 connected 为 true 时，自动将 connecting 设为 false。
   * 
   * @param connected - 是否已连接
   */
  setConnected: (connected) => set({ connected, connecting: false }),

  /**
   * 设置连接中状态
   * 
   * 当开始尝试连接或断开连接时调用。
   * 
   * @param connecting - 是否正在连接
   */
  setConnecting: (connecting) => set({ connecting }),
}));