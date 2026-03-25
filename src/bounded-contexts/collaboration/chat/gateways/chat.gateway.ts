import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { SendMessageToConversation, WsTypingEvent } from '@/shared-kernel';
import { ConversationRepository } from '../repositories/conversation.repository';
import { MessageRepository } from '../repositories/message.repository';
import { BlockService } from '../services/block.service';
import { ChatService } from '../services/chat.service';
import { type AuthenticatedSocket, WsAuthGuard } from './ws-auth.guard';

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly authGuard: WsAuthGuard;

  // Map userId -> Set of socket IDs
  private userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly blockService: BlockService,
    private readonly conversationRepo: ConversationRepository,
    private readonly messageRepo: MessageRepository,
  ) {
    this.authGuard = new WsAuthGuard(jwtService);
  }

  /**
   * Handle new WebSocket connection.
   * Authenticates user via WsAuthGuard (cookie-first, JWT fallback).
   */
  async handleConnection(client: Socket) {
    const userId = await this.authGuard.authenticate(client);
    if (!userId) {
      client.disconnect();
      return;
    }

    // Store user info on socket
    const authenticatedSocket = client as AuthenticatedSocket;
    authenticatedSocket.userId = userId;

    // Track socket
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)?.add(client.id);

    // Join user's personal room
    await client.join(`user:${userId}`);

    // Join rooms for all conversations
    const { conversations } = await this.conversationRepo.findByUserId(userId, { limit: 100 });
    for (const conv of conversations) {
      await client.join(`conversation:${conv.id}`);
    }

    // Notify others that user is online
    void this.broadcastUserStatus(userId, true);

    this.logger.log(`User ${userId} connected (socket: ${client.id})`);
  }

  /**
   * Handle WebSocket disconnection.
   */
  handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.userId;
    if (!userId) return;

    // Remove socket from tracking
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        // User has no more connections - notify others
        void this.broadcastUserStatus(userId, false);
      }
    }

    this.logger.log(`User ${userId} disconnected (socket: ${client.id})`);
  }

  /**
   * Handle incoming message.
   */
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SendMessageToConversation,
  ) {
    const userId = client.userId;

    try {
      // Send message via service
      const message = await this.chatService.sendMessageToConversation(
        userId,
        data.conversationId,
        data.content,
      );

      // Broadcast to conversation room
      this.server.to(`conversation:${data.conversationId}`).emit('message:new', {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        content: message.content,
        createdAt: message.createdAt,
        isRead: message.isRead,
      });

      // Also emit to sender for confirmation
      return { success: true, message };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send message: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Handle typing indicator.
   */
  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.userId;

    // Verify participant
    const isParticipant = await this.conversationRepo.isParticipant(data.conversationId, userId);
    if (!isParticipant) return;

    // Broadcast to other participants
    client.to(`conversation:${data.conversationId}`).emit('typing', {
      conversationId: data.conversationId,
      userId,
      isTyping: true,
    } as WsTypingEvent);
  }

  /**
   * Handle typing stop.
   */
  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.userId;

    client.to(`conversation:${data.conversationId}`).emit('typing', {
      conversationId: data.conversationId,
      userId,
      isTyping: false,
    } as WsTypingEvent);
  }

  /**
   * Handle marking messages as read.
   */
  @SubscribeMessage('message:read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.userId;

    try {
      await this.chatService.markConversationAsRead(userId, data.conversationId);

      // Notify other participant about read receipts
      client.to(`conversation:${data.conversationId}`).emit('messages:read', {
        conversationId: data.conversationId,
        readBy: userId,
        readAt: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Join a conversation room.
   */
  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.userId;

    const isParticipant = await this.conversationRepo.isParticipant(data.conversationId, userId);
    if (!isParticipant) {
      return { success: false, error: 'Not a participant' };
    }

    await client.join(`conversation:${data.conversationId}`);
    return { success: true };
  }

  /**
   * Leave a conversation room.
   */
  @SubscribeMessage('conversation:leave')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await client.leave(`conversation:${data.conversationId}`);
    return { success: true };
  }

  /**
   * Broadcast user online status to their conversations.
   */
  private async broadcastUserStatus(userId: string, isOnline: boolean) {
    const { conversations } = await this.conversationRepo.findByUserId(userId, {
      limit: 100,
    });

    for (const conv of conversations) {
      this.server.to(`conversation:${conv.id}`).emit('user:status', {
        userId,
        isOnline,
        lastSeen: isOnline ? undefined : new Date().toISOString(),
      });
    }
  }

  /**
   * Check if a user is currently online.
   */
  isUserOnline(userId: string): boolean {
    const userSocketSet = this.userSockets.get(userId);
    return userSocketSet ? userSocketSet.size > 0 : false;
  }

  /**
   * Send notification to a specific user.
   */
  notifyUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
