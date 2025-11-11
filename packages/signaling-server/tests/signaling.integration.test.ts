import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import { RoomManager } from '../src/services/RoomManager';
import { SignalingHandler } from '../src/handlers/SignalingHandler';

describe('Signaling Integration Tests', () => {
  let httpServer: any;
  let io: Server;
  let clientSocket1: ClientSocket;
  let clientSocket2: ClientSocket;
  let roomManager: RoomManager;
  let signalingHandler: SignalingHandler;

  const TEST_PORT = 3002;

  beforeEach(async () => {
    // Create HTTP server and Socket.IO server
    httpServer = createServer();
    io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    // Initialize services
    roomManager = new RoomManager();
    signalingHandler = new SignalingHandler(io, roomManager);

    // Setup signaling handler
    io.on('connection', (socket) => {
      signalingHandler.handleConnection(socket);
    });

    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(TEST_PORT, () => {
        resolve();
      });
    });

    // Create clients
    await Promise.all([
      new Promise<void>((resolve) => {
        clientSocket1 = ioc(`http://localhost:${TEST_PORT}`, {
          transports: ['websocket']
        });
        clientSocket1.on('connect', () => resolve());
      }),
      new Promise<void>((resolve) => {
        clientSocket2 = ioc(`http://localhost:${TEST_PORT}`, {
          transports: ['websocket']
        });
        clientSocket2.on('connect', () => resolve());
      })
    ]);
  });

  afterEach(async () => {
    // Cleanup
    clientSocket1?.disconnect();
    clientSocket2?.disconnect();
    io?.close();

    await new Promise<void>((resolve) => {
      httpServer?.close(() => resolve());
    });
  });

  describe('Room Management Flow', () => {
    it('should create room and emit room-created event', (done) => {
      clientSocket1.on('room-created', (roomCode: string) => {
        expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);
        expect(roomManager.getRoom(roomCode)).toBeDefined();
        done();
      });

      clientSocket1.emit('create-room');
    });

    it('should allow peer to join existing room', (done) => {
      let roomCode: string;

      // First client creates room
      clientSocket1.on('room-created', (code: string) => {
        roomCode = code;

        // Second client joins room
        clientSocket2.emit('join-room', roomCode);
      });

      // Second client should receive room-joined event
      clientSocket2.on('room-joined', (joinedRoomCode: string) => {
        expect(joinedRoomCode).toBe(roomCode);

        // Verify both peers are in room
        const room = roomManager.getRoom(roomCode);
        expect(room?.peers.size).toBe(2);
        expect(room?.peers.has(clientSocket1.id)).toBe(true);
        expect(room?.peers.has(clientSocket2.id)).toBe(true);

        done();
      });

      clientSocket1.emit('create-room');
    });

    it('should reject joining non-existent room', (done) => {
      clientSocket1.on('error', (error: string) => {
        expect(error).toBe('Room not found');
        done();
      });

      clientSocket1.emit('join-room', 'NONEXISTENT');
    });

    it('should reject joining full room', (done) => {
      let roomCode: string;

      // Create room and fill it with 2 peers
      clientSocket1.on('room-created', (code: string) => {
        roomCode = code;
        clientSocket2.emit('join-room', roomCode);
      });

      clientSocket2.on('room-joined', () => {
        // Try to add third client
        const clientSocket3 = ioc(`http://localhost:${TEST_PORT}`, {
          transports: ['websocket']
        });

        clientSocket3.on('connect', () => {
          clientSocket3.emit('join-room', roomCode);
        });

        clientSocket3.on('error', (error: string) => {
          expect(error).toBe('Room is full');
          clientSocket3.disconnect();
          done();
        });
      });

      clientSocket1.emit('create-room');
    });
  });

  describe('WebRTC Signaling Flow', () => {
    let roomCode: string;

    beforeEach((done) => {
      // Setup room with two peers
      clientSocket1.on('room-created', (code: string) => {
        roomCode = code;
        clientSocket2.emit('join-room', roomCode);
      });

      clientSocket2.on('room-joined', () => {
        done();
      });

      clientSocket1.emit('create-room');
    });

    it('should relay offer signal between peers', (done) => {
      const mockOffer = {
        type: 'offer',
        sdp: 'mock-sdp-offer-content'
      };

      clientSocket2.on('signal', (data: any) => {
        expect(data.from).toBe(clientSocket1.id);
        expect(data.message.type).toBe('offer');
        expect(data.message.payload).toEqual(mockOffer);
        done();
      });

      clientSocket1.emit('signal', {
        to: clientSocket2.id,
        message: {
          type: 'offer',
          payload: mockOffer
        }
      });
    });

    it('should relay answer signal between peers', (done) => {
      const mockAnswer = {
        type: 'answer',
        sdp: 'mock-sdp-answer-content'
      };

      clientSocket1.on('signal', (data: any) => {
        expect(data.from).toBe(clientSocket2.id);
        expect(data.message.type).toBe('answer');
        expect(data.message.payload).toEqual(mockAnswer);
        done();
      });

      clientSocket2.emit('signal', {
        to: clientSocket1.id,
        message: {
          type: 'answer',
          payload: mockAnswer
        }
      });
    });

    it('should relay ICE candidate between peers', (done) => {
      const mockCandidate = {
        candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 54400 typ host',
        sdpMid: '0',
        sdpMLineIndex: 0
      };

      clientSocket2.on('signal', (data: any) => {
        expect(data.from).toBe(clientSocket1.id);
        expect(data.message.type).toBe('ice-candidate');
        expect(data.message.payload).toEqual(mockCandidate);
        done();
      });

      clientSocket1.emit('signal', {
        to: clientSocket2.id,
        message: {
          type: 'ice-candidate',
          payload: mockCandidate
        }
      });
    });

    it('should not relay signal to non-existent peer', (done) => {
      clientSocket1.on('error', (error: string) => {
        expect(error).toBe('Peer not found');
        done();
      });

      clientSocket1.emit('signal', {
        to: 'non-existent-peer-id',
        message: {
          type: 'offer',
          payload: { type: 'offer', sdp: 'test' }
        }
      });
    });
  });

  describe('Connection Lifecycle', () => {
    it('should remove peer from room on disconnect', (done) => {
      let roomCode: string;

      clientSocket1.on('room-created', (code: string) => {
        roomCode = code;
        clientSocket2.emit('join-room', roomCode);
      });

      clientSocket2.on('room-joined', () => {
        // Verify both peers in room
        const room = roomManager.getRoom(roomCode);
        expect(room?.peers.size).toBe(2);

        // Disconnect first client
        clientSocket1.disconnect();

        // Give some time for disconnect handler to run
        setTimeout(() => {
          const roomAfterDisconnect = roomManager.getRoom(roomCode);
          expect(roomAfterDisconnect?.peers.size).toBe(1);
          expect(roomAfterDisconnect?.peers.has(clientSocket2.id)).toBe(true);
          expect(roomAfterDisconnect?.peers.has(clientSocket1.id)).toBe(false);
          done();
        }, 50);
      });

      clientSocket1.emit('create-room');
    });

    it('should handle multiple disconnections gracefully', (done) => {
      let roomCode: string;

      clientSocket1.on('room-created', (code: string) => {
        roomCode = code;
        clientSocket2.emit('join-room', roomCode);
      });

      clientSocket2.on('room-joined', () => {
        // Disconnect both clients
        clientSocket1.disconnect();
        clientSocket2.disconnect();

        // Give time for disconnect handlers
        setTimeout(() => {
          const room = roomManager.getRoom(roomCode);
          expect(room?.peers.size).toBe(0);
          done();
        }, 100);
      });

      clientSocket1.emit('create-room');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid signal format', (done) => {
      clientSocket1.on('room-created', () => {
        clientSocket1.on('error', (error: string) => {
          expect(error).toContain('Invalid signal format');
          done();
        });

        // Send malformed signal
        clientSocket1.emit('signal', 'invalid-signal-format');
      });

      clientSocket1.emit('create-room');
    });

    it('should handle signal without target peer', (done) => {
      clientSocket1.on('room-created', () => {
        clientSocket1.on('error', (error: string) => {
          expect(error).toContain('Missing target peer');
          done();
        });

        // Send signal without 'to' field
        clientSocket1.emit('signal', {
          message: { type: 'offer', payload: {} }
        });
      });

      clientSocket1.emit('create-room');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle rapid room creation', async () => {
      const roomCodes = new Set<string>();
      const promises: Promise<string>[] = [];

      // Create multiple rooms concurrently
      for (let i = 0; i < 10; i++) {
        promises.push(new Promise((resolve) => {
          const tempClient = ioc(`http://localhost:${TEST_PORT}`, {
            transports: ['websocket']
          });

          tempClient.on('connect', () => {
            tempClient.emit('create-room');
          });

          tempClient.on('room-created', (roomCode: string) => {
            resolve(roomCode);
            tempClient.disconnect();
          });
        }));
      }

      const codes = await Promise.all(promises);

      // All room codes should be unique
      codes.forEach(code => roomCodes.add(code));
      expect(roomCodes.size).toBe(10);
    });
  });
});