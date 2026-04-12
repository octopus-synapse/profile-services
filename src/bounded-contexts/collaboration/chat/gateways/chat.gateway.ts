import { Inject, Logger } from '@nestjs/common';
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
import { CHAT_USE_CASES, type ChatUseCases } from '../application/ports/chat.port';
import { ConversationRepository } from '../repositories/conversation.repository';
import type { SendMessageToConversation, WsTypingEvent } from '../schemas/chat.schema';
import { ChatCacheService } from '../services/chat-cache.service';
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
    @Inject(CHAT_USE_CASES) private readonly chat: ChatUseCases,
    private readonly conversationRepo: ConversationRepository,
    private readonly chatCache: ChatCacheService,
  ) {
    this.authGuard = new WsAuthGuard(jwtService);
  }

  async handleConnection(client: Socket) {
    const userId = await this.authGuard.authenticate(client);
    if (!userId) {
      client.disconnect();
      return;
    }

    const authenticatedSocket = client as AuthenticatedSocket;
    authenticatedSocket.userId = userId;

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)?.add(client.id);

    await client.join(`user:${userId}`);

    const { conversations } = await this.conversationRepo.findByUserId(userId, { limit: 100 });
    for (const conv of conversations) {
      await client.join(`conversation:${conv.id}`);
    }

    await this.chatCache.setOnlineStatus(userId, true);
    void this.broadcastUserStatus(userId, true);

    this.logger.log(`User ${userId} connected (socket: ${client.id})`);
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.userId;
    if (!userId) return;

    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        void this.chatCache.setOnlineStatus(userId, false);
        void this.broadcastUserStatus(userId, false);
      }
    }

    this.logger.log(`User ${userId} disconnected (socket: ${client.id})`);
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SendMessageToConversation,
  ) {
    const userId = client.userId;

    try {
      const message = await this.chat.sendMessageToConversationUseCase.execute(
        userId,
        data.conversationId,
        data.content,
      );

      this.server.to(`conversation:${data.conversationId}`).emit('message:new', {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        content: message.content,
        createdAt: message.createdAt,
        isRead: message.isRead,
      });

      return { success: true, message };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send message: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.userId;

    const isParticipant = await this.conversationRepo.isParticipant(data.conversationId, userId);
    if (!isParticipant) return;

    client.to(`conversation:${data.conversationId}`).emit('typing', {
      conversationId: data.conversationId,
      userId,
      isTyping: true,
    } as WsTypingEvent);
  }

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

  @SubscribeMessage('message:read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.userId;

    try {
      await this.chat.markConversationReadUseCase.execute(userId, data.conversationId);

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

  @SubscribeMessage('conversation:leave')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await client.leave(`conversation:${data.conversationId}`);
    return { success: true };
  }

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

  isUserOnline(userId: string): boolean {
    const userSocketSet = this.userSockets.get(userId);
    return userSocketSet ? userSocketSet.size > 0 : false;
  }

  async isUserOnlineCached(userId: string): Promise<boolean> {
    if (this.isUserOnline(userId)) {
      return true;
    }
    const status = await this.chatCache.getOnlineStatus(userId);
    return status?.isOnline ?? false;
  }

  notifyUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
