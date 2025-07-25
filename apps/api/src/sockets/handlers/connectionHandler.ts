import { Socket, Server } from 'socket.io';
import logger from '../../utils/logger';

export const handleConnection = (socket: Socket, io: Server): void => {
  logger.info(`Connection handler setup for user: ${socket.data.user.userId}`);

  // Handle user joining rooms
  socket.on('join_room', (roomId: string) => {
    socket.join(roomId);
    logger.debug(`User ${socket.data.user.userId} joined room: ${roomId}`);
    
    // Notify others in the room
    socket.to(roomId).emit('user_joined_room', {
      userId: socket.data.user.userId,
      userName: socket.data.user.name,
      timestamp: new Date(),
    });
  });

  // Handle user leaving rooms
  socket.on('leave_room', (roomId: string) => {
    socket.leave(roomId);
    logger.debug(`User ${socket.data.user.userId} left room: ${roomId}`);
    
    // Notify others in the room
    socket.to(roomId).emit('user_left_room', {
      userId: socket.data.user.userId,
      userName: socket.data.user.name,
      timestamp: new Date(),
    });
  });

  // Handle presence updates
  socket.on('update_presence', (presence: string) => {
    logger.debug(`User ${socket.data.user.userId} updated presence to: ${presence}`);
    
    // Broadcast presence update
    socket.broadcast.emit('presence_update', {
      userId: socket.data.user.userId,
      presence,
      timestamp: new Date(),
    });
  });

  // Handle ping/pong for connection health
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date() });
  });
};
