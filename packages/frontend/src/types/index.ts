export interface PeerDropState {
  // Room state
  roomCode: string | null;
  peerId: string | null;
  isConnected: boolean;
  connectionState: RTCPeerConnectionState | 'disconnected';
  
  // Transfer state
  transferState: 'idle' | 'sending' | 'receiving' | 'complete' | 'error';
  currentFile: FileMetadata | null;
  transferProgress: number;
  transferSpeed: number;
  
  // WebRTC
  peerConnection: RTCPeerConnection | null;
  dataChannel: RTCDataChannel | null;
  
  // Actions
  setRoomCode: (code: string | null) => void;
  setPeerId: (id: string | null) => void;
  setConnectionState: (state: RTCPeerConnectionState | 'disconnected') => void;
  setTransferState: (state: PeerDropState['transferState']) => void;
  setTransferProgress: (progress: number) => void;
  setTransferSpeed: (speed: number) => void;
  setCurrentFile: (file: FileMetadata | null) => void;
  setPeerConnection: (pc: RTCPeerConnection | null) => void;
  setDataChannel: (dc: RTCDataChannel | null) => void;
  reset: () => void;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  totalChunks: number;
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate';
  payload: unknown;
}
