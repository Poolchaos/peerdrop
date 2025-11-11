import type { Server, Socket } from 'socket.io';
import type { RoomManager } from '../services/RoomManager';
import type { SignalingMessage } from '../types';

export class SignalingHandler {
  constructor(
    _io: Server, // Reserved for future broadcast functionality
    private roomManager: RoomManager
  ) {}

  handleConnection(socket: Socket): void {
    console.log(`Client connected: ${socket.id}`);

    socket.on('create-room', () => {
      const room = this.roomManager.createRoom();
      this.roomManager.addPeerToRoom(room.id, socket.id);
      socket.join(room.id);
      socket.emit('room-created', { roomId: room.id });
      console.log(`Room created: ${room.id} by ${socket.id}`);
    });

    socket.on('join-room', (roomId: string) => {
      const room = this.roomManager.getRoom(roomId);

      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const added = this.roomManager.addPeerToRoom(roomId, socket.id);
      if (!added) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }

      socket.join(roomId);
      socket.emit('room-joined', { roomId });

      // Notify other peer in room
      socket.to(roomId).emit('peer-joined', { peerId: socket.id });
      console.log(`${socket.id} joined room ${roomId}`);
    });

    socket.on('signal', (message: SignalingMessage) => {
      const room = this.roomManager.findRoomByPeer(socket.id);
      if (!room) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }

      // Forward signal to other peer
      socket.to(room.id).emit('signal', {
        ...message,
        from: socket.id,
      });
    });

    socket.on('disconnect', () => {
      const room = this.roomManager.findRoomByPeer(socket.id);
      if (room) {
        this.roomManager.removePeerFromRoom(room.id, socket.id);
        socket.to(room.id).emit('peer-disconnected', { peerId: socket.id });
        console.log(`${socket.id} disconnected from room ${room.id}`);
      }
      console.log(`Client disconnected: ${socket.id}`);
    });
  }
}
