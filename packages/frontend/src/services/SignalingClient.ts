import { io, Socket } from 'socket.io-client';

const SIGNALING_SERVER_URL = import.meta.env.VITE_SIGNALING_SERVER_URL || 'http://localhost:3001';

export class SignalingClient {
  private socket: Socket | null = null;
  private onSignalCallback: ((message: unknown) => void) | null = null;
  private onRoomCreatedCallback: ((roomCode: string) => void) | null = null;
  private onRoomJoinedCallback: ((roomCode: string) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io(SIGNALING_SERVER_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('room-created', (roomCode: string) => {
      this.onRoomCreatedCallback?.(roomCode);
    });

    this.socket.on('room-joined', (roomCode: string) => {
      this.onRoomJoinedCallback?.(roomCode);
    });

    this.socket.on('signal', (message: unknown) => {
      this.onSignalCallback?.(message);
    });

    this.socket.on('error', (error: string) => {
      this.onErrorCallback?.(error);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  createRoom(): void {
    this.socket?.emit('create-room');
  }

  joinRoom(roomCode: string): void {
    this.socket?.emit('join-room', roomCode);
  }

  sendSignal(to: string, message: unknown): void {
    this.socket?.emit('signal', { to, message });
  }

  onRoomCreated(callback: (roomCode: string) => void): void {
    this.onRoomCreatedCallback = callback;
  }

  onRoomJoined(callback: (roomCode: string) => void): void {
    this.onRoomJoinedCallback = callback;
  }

  onSignal(callback: (message: unknown) => void): void {
    this.onSignalCallback = callback;
  }

  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  get socketId(): string | undefined {
    return this.socket?.id;
  }
}

export const signalingClient = new SignalingClient();
