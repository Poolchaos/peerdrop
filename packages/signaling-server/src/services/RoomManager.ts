import type { Room } from '../types';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly ROOM_EXPIRY_HOURS = 24;
  private readonly CLEANUP_INTERVAL_MS = 60000; // 1 minute

  generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  createRoom(): Room {
    const code = this.generateRoomCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.ROOM_EXPIRY_HOURS * 60 * 60 * 1000);

    const room: Room = {
      id: code,
      createdAt: now,
      expiresAt,
      peers: new Set(),
    };

    this.rooms.set(code, room);
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  addPeerToRoom(roomId: string, peerId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const MAX_PEERS = 2;
    if (room.peers.size >= MAX_PEERS) return false;

    room.peers.add(peerId);
    return true;
  }

  removePeerFromRoom(roomId: string, peerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.peers.delete(peerId);

    // Delete room if empty
    if (room.peers.size === 0) {
      this.rooms.delete(roomId);
    }
  }

  findRoomByPeer(peerId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.peers.has(peerId)) {
        return room;
      }
    }
    return undefined;
  }

  cleanupExpiredRooms(): void {
    const now = new Date();
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.expiresAt < now) {
        this.rooms.delete(roomId);
        console.log(`Room ${roomId} expired and removed`);
      }
    }
  }

  startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredRooms();
    }, this.CLEANUP_INTERVAL_MS);
  }

  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  getRoomCount(): number {
    return this.rooms.size;
  }
}
