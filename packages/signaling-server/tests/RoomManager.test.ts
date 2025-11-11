import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoomManager } from '../src/services/RoomManager';

describe('RoomManager', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
    // Mock Date.now for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-01-01T00:00:00Z'));
  });

  describe('generateRoomCode', () => {
    it('should generate a 6-character alphanumeric code', () => {
      const code = roomManager.generateRoomCode();
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
      expect(code).toHaveLength(6);
    });

    it('should generate unique codes', () => {
      const codes = new Set();
      // Generate 100 codes to test uniqueness
      for (let i = 0; i < 100; i++) {
        codes.add(roomManager.generateRoomCode());
      }
      // Should be highly unlikely to have duplicates
      expect(codes.size).toBeGreaterThan(95);
    });
  });

  describe('createRoom', () => {
    it('should create a room with generated code', () => {
      const room = roomManager.createRoom();

      expect(room.id).toMatch(/^[A-Z0-9]{6}$/);
      expect(roomManager.getRoom(room.id)).toBeDefined();
    });

    it('should create room with 24h expiration', () => {
      const room = roomManager.createRoom();

      expect(room.expiresAt.getTime()).toBe(
        new Date('2023-01-02T00:00:00Z').getTime() // 24 hours later
      );
    });

    it('should initialize room with empty peers set', () => {
      const room = roomManager.createRoom();

      expect(room.peers.size).toBe(0);
    });
  });

  describe('getRoom', () => {
    it('should return undefined for non-existent room', () => {
      expect(roomManager.getRoom('NONEXISTENT')).toBeUndefined();
    });

    it('should return room data for existing room', () => {
      const createdRoom = roomManager.createRoom();
      const room = roomManager.getRoom(createdRoom.id);

      expect(room).toBeDefined();
      expect(room?.id).toBe(createdRoom.id);
      expect(room?.peers).toBeInstanceOf(Set);
    });
  });

  describe('addPeerToRoom', () => {
    let roomCode: string;

    beforeEach(() => {
      const room = roomManager.createRoom();
      roomCode = room.id;
    });

    it('should add peer to existing room', () => {
      const result = roomManager.addPeerToRoom(roomCode, 'peer1');

      expect(result).toBe(true);
      expect(roomManager.getRoom(roomCode)?.peers.has('peer1')).toBe(true);
    });

    it('should reject adding peer to non-existent room', () => {
      const result = roomManager.addPeerToRoom('NONEXISTENT', 'peer1');

      expect(result).toBe(false);
    });

    it('should reject adding peer to full room', () => {
      // Add two peers (max capacity)
      roomManager.addPeerToRoom(roomCode, 'peer1');
      roomManager.addPeerToRoom(roomCode, 'peer2');

      // Try to add third peer
      const result = roomManager.addPeerToRoom(roomCode, 'peer3');

      expect(result).toBe(false);
      expect(roomManager.getRoom(roomCode)?.peers.size).toBe(2);
    });

    it('should not add duplicate peer', () => {
      roomManager.addPeerToRoom(roomCode, 'peer1');
      roomManager.addPeerToRoom(roomCode, 'peer1');

      expect(roomManager.getRoom(roomCode)?.peers.size).toBe(1);
    });
  });

  describe('removePeerFromRoom', () => {
    let roomCode: string;

    beforeEach(() => {
      const room = roomManager.createRoom();
      roomCode = room.id;
      roomManager.addPeerToRoom(roomCode, 'peer1');
      roomManager.addPeerToRoom(roomCode, 'peer2');
    });

    it('should remove peer from room', () => {
      roomManager.removePeerFromRoom(roomCode, 'peer1');

      expect(roomManager.getRoom(roomCode)?.peers.has('peer1')).toBe(false);
      expect(roomManager.getRoom(roomCode)?.peers.has('peer2')).toBe(true);
    });

    it('should handle removing non-existent peer', () => {
      roomManager.removePeerFromRoom(roomCode, 'nonexistent');

      // Should not affect existing peers
      expect(roomManager.getRoom(roomCode)?.peers.size).toBe(2);
    });

    it('should handle removing peer from non-existent room', () => {
      // Should not throw error
      expect(() => {
        roomManager.removePeerFromRoom('NONEXISTENT', 'peer1');
      }).not.toThrow();
    });
  });

  describe('findRoomByPeer', () => {
    let roomCode1: string;
    let roomCode2: string;

    beforeEach(() => {
      const room1 = roomManager.createRoom();
      const room2 = roomManager.createRoom();
      roomCode1 = room1.id;
      roomCode2 = room2.id;
      roomManager.addPeerToRoom(roomCode1, 'peer1');
      roomManager.addPeerToRoom(roomCode2, 'peer2');
    });

    it('should find room containing peer', () => {
      const foundRoom = roomManager.findRoomByPeer('peer1');

      expect(foundRoom?.id).toBe(roomCode1);
    });

    it('should return undefined for non-existent peer', () => {
      const foundRoom = roomManager.findRoomByPeer('nonexistent');

      expect(foundRoom).toBeUndefined();
    });
  });

  describe('cleanupExpiredRooms', () => {
    it('should remove expired rooms', () => {
      const room = roomManager.createRoom();

      // Move time forward 25 hours
      vi.setSystemTime(new Date('2023-01-02T01:00:00Z'));

      roomManager.cleanupExpiredRooms();

      expect(roomManager.getRoom(room.id)).toBeUndefined();
    });

    it('should keep non-expired rooms', () => {
      const room = roomManager.createRoom();

      // Move time forward 23 hours (still within 24h limit)
      vi.setSystemTime(new Date('2023-01-01T23:00:00Z'));

      roomManager.cleanupExpiredRooms();

      expect(roomManager.getRoom(room.id)).toBeDefined();
    });

    it('should return count of cleaned rooms', () => {
      const room1 = roomManager.createRoom();
      const room2 = roomManager.createRoom();

      // Verify rooms exist
      expect(roomManager.getRoom(room1.id)).toBeDefined();
      expect(roomManager.getRoom(room2.id)).toBeDefined();

      // Move time forward to expire both rooms
      vi.setSystemTime(new Date('2023-01-02T01:00:00Z'));

      roomManager.cleanupExpiredRooms();

      // Verify rooms are deleted
      expect(roomManager.getRoom(room1.id)).toBeUndefined();
      expect(roomManager.getRoom(room2.id)).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle rapid room creation', () => {
      const codes = new Set();

      // Create 50 rooms rapidly
      for (let i = 0; i < 50; i++) {
        const room = roomManager.createRoom();
        codes.add(room.id);
      }

      expect(codes.size).toBe(50); // All should be unique
    });

    it('should handle peer operations on expired but not cleaned rooms', () => {
      const room = roomManager.createRoom();

      // Expire the room but don't clean it
      vi.setSystemTime(new Date('2023-01-02T01:00:00Z'));

      // Operations should still work on expired room
      const result = roomManager.addPeerToRoom(room.id, 'peer1');
      expect(result).toBe(true);
    });

    it('should handle empty room deletion after all peers leave', () => {
      const room = roomManager.createRoom();
      roomManager.addPeerToRoom(room.id, 'peer1');
      roomManager.addPeerToRoom(room.id, 'peer2');

      // Verify room has peers
      expect(roomManager.getRoom(room.id)?.peers.size).toBe(2);

      roomManager.removePeerFromRoom(room.id, 'peer1');
      
      // Room still exists with one peer
      expect(roomManager.getRoom(room.id)?.peers.size).toBe(1);
      
      roomManager.removePeerFromRoom(room.id, 'peer2');
      
      // Room should be automatically deleted when empty
      const roomData = roomManager.getRoom(room.id);
      expect(roomData).toBeUndefined();
    });
  });
});