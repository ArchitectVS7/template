import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';

interface ConnectedClient {
  id: string;
  userId?: string;
  joinedAt: Date;
}

class WebSocketService {
  private io: SocketIOServer;
  private connectedClients: Map<string, ConnectedClient> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      logger.info('WebSocket client connected:', { socketId: socket.id });

      // Add client to connected clients
      this.connectedClients.set(socket.id, {
        id: socket.id,
        joinedAt: new Date()
      });

      // Handle authentication
      socket.on('authenticate', (data) => {
        const client = this.connectedClients.get(socket.id);
        if (client && data.userId) {
          client.userId = data.userId;
          socket.join(`user_${data.userId}`);
          logger.info('WebSocket client authenticated:', { 
            socketId: socket.id, 
            userId: data.userId 
          });
        }
      });

      // Handle joining debug room (for admin users)
      socket.on('join_debug', () => {
        socket.join('debug_room');
        logger.info('Client joined debug room:', { socketId: socket.id });
      });

      // Handle leaving debug room
      socket.on('leave_debug', () => {
        socket.leave('debug_room');
        logger.info('Client left debug room:', { socketId: socket.id });
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logger.info('WebSocket client disconnected:', { 
          socketId: socket.id, 
          reason 
        });
        this.connectedClients.delete(socket.id);
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error('WebSocket error:', { 
          socketId: socket.id, 
          error: error.message 
        });
      });
    });
  }

  // Broadcast to all connected clients
  public broadcast(event: string, data: any) {
    this.io.emit(event, data);
  }

  // Send to specific user
  public sendToUser(userId: string, event: string, data: any) {
    this.io.to(`user_${userId}`).emit(event, data);
  }

  // Send to debug room (admin users)
  public sendToDebugRoom(event: string, data: any) {
    this.io.to('debug_room').emit(event, data);
  }

  // Send system status update
  public broadcastSystemStatus(status: {
    component: string;
    status: 'healthy' | 'warning' | 'critical';
    message?: string;
    timestamp: Date;
  }) {
    this.sendToDebugRoom('system_status', status);
  }

  // Send new log entry to debug room
  public broadcastLogEntry(logEntry: any) {
    this.sendToDebugRoom('new_log', logEntry);
  }

  // Get connection statistics
  public getConnectionStats() {
    const now = new Date();
    const clients = Array.from(this.connectedClients.values());
    
    return {
      totalConnections: clients.length,
      authenticatedConnections: clients.filter(c => c.userId).length,
      averageConnectionTime: clients.reduce((sum, client) => {
        return sum + (now.getTime() - client.joinedAt.getTime());
      }, 0) / clients.length || 0,
      connections: clients.map(client => ({
        id: client.id,
        userId: client.userId,
        connectedFor: now.getTime() - client.joinedAt.getTime()
      }))
    };
  }
}

let webSocketService: WebSocketService | null = null;

export const setupWebSocket = (io: SocketIOServer) => {
  webSocketService = new WebSocketService(io);
  return webSocketService;
};

export const getWebSocketService = (): WebSocketService => {
  if (!webSocketService) {
    throw new Error('WebSocket service not initialized');
  }
  return webSocketService;
};

export default webSocketService;