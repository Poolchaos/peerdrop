import { describe, it, expect, beforeEach } from 'vitest';
import { usePeerDropStore } from '../src/store/usePeerDropStore';

describe('usePeerDropStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    usePeerDropStore.setState({
      roomCode: null,
      peerId: null,
      isConnected: false,
      connectionState: 'disconnected',
      transferState: 'idle',
      currentFile: null,
      transferProgress: 0,
      transferSpeed: 0,
      peerConnection: null,
      dataChannel: null,
    });
  });

  it('should initialize with default state', () => {
    const store = usePeerDropStore.getState();

    expect(store.roomCode).toBeNull();
    expect(store.peerId).toBeNull();
    expect(store.isConnected).toBe(false);
    expect(store.connectionState).toBe('disconnected');
    expect(store.transferState).toBe('idle');
    expect(store.currentFile).toBeNull();
    expect(store.transferProgress).toBe(0);
    expect(store.transferSpeed).toBe(0);
  });

  it('should update room code', () => {
    const { setRoomCode } = usePeerDropStore.getState();

    setRoomCode('ABC123');

    expect(usePeerDropStore.getState().roomCode).toBe('ABC123');
  });

  it('should update connection state and isConnected flag', () => {
    const { setConnectionState } = usePeerDropStore.getState();

    setConnectionState('connected');

    const state = usePeerDropStore.getState();
    expect(state.connectionState).toBe('connected');
    expect(state.isConnected).toBe(true);
  });

  it('should set isConnected false for non-connected states', () => {
    const { setConnectionState } = usePeerDropStore.getState();

    setConnectionState('connecting');

    const state = usePeerDropStore.getState();
    expect(state.connectionState).toBe('connecting');
    expect(state.isConnected).toBe(false);
  });

  it('should update transfer state', () => {
    const { setTransferState } = usePeerDropStore.getState();

    setTransferState('sending');

    expect(usePeerDropStore.getState().transferState).toBe('sending');
  });

  it('should update transfer progress', () => {
    const { setTransferProgress } = usePeerDropStore.getState();

    setTransferProgress(75.5);

    expect(usePeerDropStore.getState().transferProgress).toBe(75.5);
  });

  it('should update transfer speed', () => {
    const { setTransferSpeed } = usePeerDropStore.getState();

    setTransferSpeed(1024000);

    expect(usePeerDropStore.getState().transferSpeed).toBe(1024000);
  });

  it('should set current file metadata', () => {
    const { setCurrentFile } = usePeerDropStore.getState();

    const fileMetadata = {
      name: 'test.txt',
      size: 1024,
      type: 'text/plain',
      totalChunks: 1,
    };

    setCurrentFile(fileMetadata);

    expect(usePeerDropStore.getState().currentFile).toEqual(fileMetadata);
  });

  it('should reset state to initial values', () => {
    const store = usePeerDropStore.getState();

    // Set some state
    store.setRoomCode('ABC123');
    store.setConnectionState('connected');
    store.setTransferState('sending');
    store.setTransferProgress(50);

    // Reset
    store.reset();

    const resetState = usePeerDropStore.getState();
    expect(resetState.roomCode).toBeNull();
    expect(resetState.connectionState).toBe('disconnected');
    expect(resetState.isConnected).toBe(false);
    expect(resetState.transferState).toBe('idle');
    expect(resetState.transferProgress).toBe(0);
  });

  it('should handle peer connection updates', () => {
    const { setPeerConnection } = usePeerDropStore.getState();

    // Mock minimal RTCPeerConnection
    const mockPeerConnection = {
      connectionState: 'new'
    } as RTCPeerConnection;

    setPeerConnection(mockPeerConnection);

    expect(usePeerDropStore.getState().peerConnection).toBe(mockPeerConnection);

    setPeerConnection(null);

    expect(usePeerDropStore.getState().peerConnection).toBeNull();
  });

  it('should handle data channel updates', () => {
    const { setDataChannel } = usePeerDropStore.getState();

    const mockDataChannel = {
      binaryType: 'arraybuffer',
      readyState: 'open',
    } as RTCDataChannel;

    setDataChannel(mockDataChannel);

    expect(usePeerDropStore.getState().dataChannel).toBe(mockDataChannel);

    setDataChannel(null);

    expect(usePeerDropStore.getState().dataChannel).toBeNull();
  });

  it('should handle peer ID updates', () => {
    const { setPeerId } = usePeerDropStore.getState();

    setPeerId('peer-123');

    expect(usePeerDropStore.getState().peerId).toBe('peer-123');

    setPeerId(null);

    expect(usePeerDropStore.getState().peerId).toBeNull();
  });

  it('should handle all transfer states', () => {
    const { setTransferState } = usePeerDropStore.getState();
    const states = ['idle', 'sending', 'receiving', 'complete', 'error'] as const;

    states.forEach(state => {
      setTransferState(state);
      expect(usePeerDropStore.getState().transferState).toBe(state);
    });
  });

  it('should handle all connection states', () => {
    const { setConnectionState } = usePeerDropStore.getState();
    const states = ['disconnected', 'connecting', 'connected', 'failed'] as const;

    states.forEach(state => {
      setConnectionState(state);
      const storeState = usePeerDropStore.getState();
      expect(storeState.connectionState).toBe(state);
      expect(storeState.isConnected).toBe(state === 'connected');
    });
  });
});