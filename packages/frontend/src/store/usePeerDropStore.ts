import { create } from 'zustand';
import type { PeerDropState } from '../types';

const initialState = {
  roomCode: null,
  peerId: null,
  isConnected: false,
  connectionState: 'disconnected' as const,
  transferState: 'idle' as const,
  currentFile: null,
  transferProgress: 0,
  transferSpeed: 0,
  peerConnection: null,
  dataChannel: null,
};

export const usePeerDropStore = create<PeerDropState>((set) => ({
  ...initialState,

  setRoomCode: (code) => set({ roomCode: code }),

  setPeerId: (id) => set({ peerId: id }),

  setConnectionState: (state) =>
    set({
      connectionState: state,
      isConnected: state === 'connected',
    }),

  setTransferState: (state) => set({ transferState: state }),

  setTransferProgress: (progress) => set({ transferProgress: progress }),

  setTransferSpeed: (speed) => set({ transferSpeed: speed }),

  setCurrentFile: (file) => set({ currentFile: file }),

  setPeerConnection: (pc) => set({ peerConnection: pc }),

  setDataChannel: (dc) => set({ dataChannel: dc }),

  reset: () => set(initialState),
}));
