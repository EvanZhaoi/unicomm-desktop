import { create } from "zustand";

interface SocketState {
  connected: boolean;
  connecting: boolean;
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  connected: false,
  connecting: false,
  setConnected: (connected) => set({ connected, connecting: false }),
  setConnecting: (connecting) => set({ connecting }),
}));