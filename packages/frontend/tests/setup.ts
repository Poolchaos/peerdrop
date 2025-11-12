import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock WebRTC APIs that aren't available in test environment
global.RTCPeerConnection = class RTCPeerConnection {
  constructor() {}
  createOffer = () => Promise.resolve({} as RTCSessionDescriptionInit);
  createAnswer = () => Promise.resolve({} as RTCSessionDescriptionInit);
  setLocalDescription = () => Promise.resolve();
  setRemoteDescription = () => Promise.resolve();
  addIceCandidate = () => Promise.resolve();
  createDataChannel = () => ({} as RTCDataChannel);
  close = () => {};
  addEventListener = () => {};
  removeEventListener = () => {};
} as any;

global.RTCDataChannel = class RTCDataChannel {
  constructor() {}
  send = () => {};
  close = () => {};
  addEventListener = () => {};
  removeEventListener = () => {};
} as any;

// Mock Socket.IO client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  })),
}));