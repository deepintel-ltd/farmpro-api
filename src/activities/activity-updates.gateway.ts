import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  organizationId?: string;
}

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:5173',
      'https://localhost:5173',
      /^https:\/\/.*\.farmpro\.app$/,
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
    ],
  },
  namespace: '/activities',
})
export class ActivityUpdatesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ActivityUpdatesGateway.name);
  private connectedClients = new Map<string, AuthenticatedSocket>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`Client connected: ${client.id}`);
    
    try {
      // Extract token from handshake auth or query
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      
      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token as string);
      client.userId = payload.sub;
      client.organizationId = payload.organizationId;
      
      this.connectedClients.set(client.id, client);
      this.logger.log(`Client ${client.id} authenticated for user ${client.userId}`);
      
    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}:`, error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('join-activity')
  async handleJoinActivity(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { activityId: string },
  ) {
    if (!client.userId || !client.organizationId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      // Verify user has access to this activity
      const activity = await this.prisma.farmActivity.findFirst({
        where: {
          id: data.activityId,
          farm: {
            organizationId: client.organizationId,
          },
        },
        include: {
          farm: true,
          cropCycle: {
            include: {
              commodity: true,
            },
          },
        },
      });

      if (!activity) {
        client.emit('error', { message: 'Activity not found or access denied' });
        return;
      }

      // Join the activity room
      await client.join(`activity-${data.activityId}`);
      client.emit('joined-activity', { activityId: data.activityId });
      
      this.logger.log(`Client ${client.id} joined activity ${data.activityId}`);
    } catch (error) {
      this.logger.error(`Error joining activity:`, error.message);
      client.emit('error', { message: 'Failed to join activity' });
    }
  }

  @SubscribeMessage('leave-activity')
  async handleLeaveActivity(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { activityId: string },
  ) {
    await client.leave(`activity-${data.activityId}`);
    client.emit('left-activity', { activityId: data.activityId });
    this.logger.log(`Client ${client.id} left activity ${data.activityId}`);
  }

  @SubscribeMessage('join-farm')
  async handleJoinFarm(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { farmId: string },
  ) {
    if (!client.userId || !client.organizationId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      // Verify user has access to this farm
      const farm = await this.prisma.farm.findFirst({
        where: {
          id: data.farmId,
          organizationId: client.organizationId,
        },
      });

      if (!farm) {
        client.emit('error', { message: 'Farm not found or access denied' });
        return;
      }

      // Join the farm room
      await client.join(`farm-${data.farmId}`);
      client.emit('joined-farm', { farmId: data.farmId });
      
      this.logger.log(`Client ${client.id} joined farm ${data.farmId}`);
    } catch (error) {
      this.logger.error(`Error joining farm:`, error.message);
      client.emit('error', { message: 'Failed to join farm' });
    }
  }

  @SubscribeMessage('leave-farm')
  async handleLeaveFarm(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { farmId: string },
  ) {
    await client.leave(`farm-${data.farmId}`);
    client.emit('left-farm', { farmId: data.farmId });
    this.logger.log(`Client ${client.id} left farm ${data.farmId}`);
  }

  // Broadcast activity updates to all clients in the activity room
  async broadcastActivityUpdate(activityId: string, update: any) {
    this.server.to(`activity-${activityId}`).emit('activity-updated', {
      activityId,
      update,
      timestamp: new Date().toISOString(),
    });
    
    this.logger.log(`Broadcasted activity update for ${activityId}`);
  }

  // Broadcast farm updates to all clients in the farm room
  async broadcastFarmUpdate(farmId: string, update: any) {
    this.server.to(`farm-${farmId}`).emit('farm-updated', {
      farmId,
      update,
      timestamp: new Date().toISOString(),
    });
    
    this.logger.log(`Broadcasted farm update for ${farmId}`);
  }

  // Broadcast to specific user
  async broadcastToUser(userId: string, event: string, data: any) {
    const userClients = Array.from(this.connectedClients.values())
      .filter(client => client.userId === userId);
    
    userClients.forEach(client => {
      client.emit(event, data);
    });
    
    this.logger.log(`Broadcasted ${event} to user ${userId} (${userClients.length} clients)`);
  }

  // Broadcast to organization
  async broadcastToOrganization(organizationId: string, event: string, data: any) {
    const orgClients = Array.from(this.connectedClients.values())
      .filter(client => client.organizationId === organizationId);
    
    orgClients.forEach(client => {
      client.emit(event, data);
    });
    
    this.logger.log(`Broadcasted ${event} to organization ${organizationId} (${orgClients.length} clients)`);
  }

  // Get connected clients count
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  // Get clients for a specific organization
  getOrganizationClients(organizationId: string): AuthenticatedSocket[] {
    return Array.from(this.connectedClients.values())
      .filter(client => client.organizationId === organizationId);
  }
}
