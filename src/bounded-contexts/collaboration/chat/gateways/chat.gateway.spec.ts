import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import type { Socket } from 'socket.io';
import { CHAT_USE_CASES } from '../application/ports/chat.port';
import { ConversationRepository } from '../repositories/conversation.repository';
import { ChatCacheService } from '../services/chat-cache.service';
import {
  createMockBroadcastOperator,
  createMockServer,
  createMockSocket,
  InMemoryChatCacheService,
  InMemoryConversationRepository,
} from '../testing';
import { ChatGateway } from './chat.gateway';
import type { AuthenticatedSocket } from './ws-auth.guard';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let conversationRepo: InMemoryConversationRepository;
  let chatCache: InMemoryChatCacheService;
  let jwtService: { verify: ReturnType<typeof mock>; verifyAsync: ReturnType<typeof mock> };
  let chatUseCases: {
    sendMessageToConversationUseCase: { execute: ReturnType<typeof mock> };
    markConversationReadUseCase: { execute: ReturnType<typeof mock> };
  };

  beforeEach(async () => {
    conversationRepo = new InMemoryConversationRepository();
    chatCache = new InMemoryChatCacheService();

    jwtService = {
      verify: mock(() => ({ sub: 'user-1', email: 'user1@test.com' })),
      verifyAsync: mock(() => Promise.resolve({ sub: 'user-1', email: 'user1@test.com' })),
    };

    chatUseCases = {
      sendMessageToConversationUseCase: { execute: mock() },
      markConversationReadUseCase: { execute: mock() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: JwtService, useValue: jwtService },
        { provide: CHAT_USE_CASES, useValue: chatUseCases },
        { provide: ConversationRepository, useValue: conversationRepo },
        { provide: ChatCacheService, useValue: chatCache },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);

    gateway.server = createMockServer();

    conversationRepo.seedUser({ id: 'user-1', name: 'User 1', username: 'user1' });
    conversationRepo.seedUser({ id: 'user-2', name: 'User 2', username: 'user2' });
    conversationRepo.seedConversation({
      id: 'conv-1',
      participant1Id: 'user-1',
      participant2Id: 'user-2',
    });
  });

  describe('handleConnection', () => {
    it('should disconnect client without valid authentication', async () => {
      const mockSocket = createMockSocket({ userId: undefined }) as unknown as Socket;

      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should track socket when authenticated', async () => {
      const mockSocket = createMockSocket();

      jwtService.verify.mockReturnValue({ sub: 'user-1' });

      (mockSocket as AuthenticatedSocket).userId = 'user-1';

      await gateway.handleConnection(mockSocket);

      expect(gateway.isUserOnline('user-1')).toBe(true);
    });

    it('should join user personal room', async () => {
      const mockSocket = createMockSocket();
      jwtService.verify.mockReturnValue({ sub: 'user-1' });

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.join).toHaveBeenCalledWith('user:user-1');
    });

    it('should set online status in cache', async () => {
      const mockSocket = createMockSocket();
      jwtService.verify.mockReturnValue({ sub: 'user-1' });

      await gateway.handleConnection(mockSocket);

      const status = await chatCache.getOnlineStatus('user-1');
      expect(status?.isOnline).toBe(true);
    });
  });

  describe('handleDisconnect', () => {
    it('should remove socket tracking on disconnect', async () => {
      const mockSocket = createMockSocket();
      jwtService.verify.mockReturnValue({ sub: 'user-1' });

      await gateway.handleConnection(mockSocket);
      expect(gateway.isUserOnline('user-1')).toBe(true);

      gateway.handleDisconnect(mockSocket);
      expect(gateway.isUserOnline('user-1')).toBe(false);
    });

    it('should handle disconnect without userId gracefully', () => {
      const mockSocket = createMockSocket({ userId: undefined });

      expect(() => gateway.handleDisconnect(mockSocket)).not.toThrow();
    });

    it('should keep user online if multiple sockets are connected', async () => {
      const socket1 = createMockSocket({ id: 'socket-1' });
      const socket2 = createMockSocket({ id: 'socket-2' });

      jwtService.verify.mockReturnValue({ sub: 'user-1' });

      await gateway.handleConnection(socket1);
      await gateway.handleConnection(socket2);

      gateway.handleDisconnect(socket1);

      expect(gateway.isUserOnline('user-1')).toBe(true);
    });
  });

  describe('handleSendMessage', () => {
    it('should send message and return success', async () => {
      const mockSocket = createMockSocket();
      const mockMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Hello!',
        createdAt: new Date().toISOString(),
        isRead: false,
      };

      chatUseCases.sendMessageToConversationUseCase.execute.mockResolvedValue(mockMessage);

      const result = await gateway.handleSendMessage(mockSocket, {
        conversationId: 'conv-1',
        content: 'Hello!',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
    });

    it('should broadcast message to conversation room', async () => {
      const mockSocket = createMockSocket();
      const broadcastOperator = createMockBroadcastOperator();
      gateway.server.to = mock(() => broadcastOperator);

      const mockMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Hello!',
        createdAt: new Date().toISOString(),
        isRead: false,
      };

      chatUseCases.sendMessageToConversationUseCase.execute.mockResolvedValue(mockMessage);

      await gateway.handleSendMessage(mockSocket, {
        conversationId: 'conv-1',
        content: 'Hello!',
      });

      expect(gateway.server.to).toHaveBeenCalledWith('conversation:conv-1');
      expect(broadcastOperator.emit).toHaveBeenCalledWith('message:new', expect.any(Object));
    });

    it('should return error on failure', async () => {
      const mockSocket = createMockSocket();
      chatUseCases.sendMessageToConversationUseCase.execute.mockRejectedValue(
        new Error('Test error'),
      );

      const result = await gateway.handleSendMessage(mockSocket, {
        conversationId: 'conv-1',
        content: 'Hello!',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
    });
  });

  describe('handleTypingStart', () => {
    it('should broadcast typing indicator to conversation', async () => {
      const broadcastOperator = createMockBroadcastOperator();
      const mockSocket = createMockSocket();
      mockSocket.to = mock(() => broadcastOperator);

      await gateway.handleTypingStart(mockSocket, { conversationId: 'conv-1' });

      expect(mockSocket.to).toHaveBeenCalledWith('conversation:conv-1');
      expect(broadcastOperator.emit).toHaveBeenCalledWith('typing', {
        conversationId: 'conv-1',
        userId: 'user-1',
        isTyping: true,
      });
    });

    it('should not broadcast if not a participant', async () => {
      const broadcastOperator = createMockBroadcastOperator();
      const mockSocket = createMockSocket({ userId: 'user-3' });
      mockSocket.to = mock(() => broadcastOperator);

      await gateway.handleTypingStart(mockSocket, { conversationId: 'conv-1' });

      expect(broadcastOperator.emit).not.toHaveBeenCalled();
    });
  });

  describe('handleTypingStop', () => {
    it('should broadcast typing stop to conversation', () => {
      const broadcastOperator = createMockBroadcastOperator();
      const mockSocket = createMockSocket();
      mockSocket.to = mock(() => broadcastOperator);

      gateway.handleTypingStop(mockSocket, { conversationId: 'conv-1' });

      expect(mockSocket.to).toHaveBeenCalledWith('conversation:conv-1');
      expect(broadcastOperator.emit).toHaveBeenCalledWith('typing', {
        conversationId: 'conv-1',
        userId: 'user-1',
        isTyping: false,
      });
    });
  });

  describe('handleMarkRead', () => {
    it('should mark messages as read and return success', async () => {
      const mockSocket = createMockSocket();
      chatUseCases.markConversationReadUseCase.execute.mockResolvedValue({ count: 5 });

      const result = await gateway.handleMarkRead(mockSocket, { conversationId: 'conv-1' });

      expect(result.success).toBe(true);
      expect(chatUseCases.markConversationReadUseCase.execute).toHaveBeenCalledWith(
        'user-1',
        'conv-1',
      );
    });

    it('should broadcast read receipt to conversation', async () => {
      const broadcastOperator = createMockBroadcastOperator();
      const mockSocket = createMockSocket();
      mockSocket.to = mock(() => broadcastOperator);
      chatUseCases.markConversationReadUseCase.execute.mockResolvedValue({ count: 5 });

      await gateway.handleMarkRead(mockSocket, { conversationId: 'conv-1' });

      expect(broadcastOperator.emit).toHaveBeenCalledWith(
        'messages:read',
        expect.objectContaining({
          conversationId: 'conv-1',
          readBy: 'user-1',
        }),
      );
    });

    it('should return error on failure', async () => {
      const mockSocket = createMockSocket();
      chatUseCases.markConversationReadUseCase.execute.mockRejectedValue(
        new Error('Not authorized'),
      );

      const result = await gateway.handleMarkRead(mockSocket, { conversationId: 'conv-1' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authorized');
    });
  });

  describe('handleJoinConversation', () => {
    it('should allow participant to join conversation room', async () => {
      const mockSocket = createMockSocket();

      const result = await gateway.handleJoinConversation(mockSocket, {
        conversationId: 'conv-1',
      });

      expect(result.success).toBe(true);
      expect(mockSocket.join).toHaveBeenCalledWith('conversation:conv-1');
    });

    it('should reject non-participant', async () => {
      const mockSocket = createMockSocket({ userId: 'user-3' });

      const result = await gateway.handleJoinConversation(mockSocket, {
        conversationId: 'conv-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not a participant');
    });
  });

  describe('handleLeaveConversation', () => {
    it('should leave conversation room', async () => {
      const mockSocket = createMockSocket();

      const result = await gateway.handleLeaveConversation(mockSocket, {
        conversationId: 'conv-1',
      });

      expect(result.success).toBe(true);
      expect(mockSocket.leave).toHaveBeenCalledWith('conversation:conv-1');
    });
  });

  describe('isUserOnline', () => {
    it('should return false when no sockets connected', () => {
      expect(gateway.isUserOnline('user-1')).toBe(false);
    });

    it('should return true when socket connected', async () => {
      const mockSocket = createMockSocket();
      jwtService.verify.mockReturnValue({ sub: 'user-1' });

      await gateway.handleConnection(mockSocket);

      expect(gateway.isUserOnline('user-1')).toBe(true);
    });
  });

  describe('isUserOnlineCached', () => {
    it('should check local sockets first', async () => {
      const mockSocket = createMockSocket();
      jwtService.verify.mockReturnValue({ sub: 'user-1' });
      await gateway.handleConnection(mockSocket);

      const isOnline = await gateway.isUserOnlineCached('user-1');

      expect(isOnline).toBe(true);
    });

    it('should fallback to cache when no local sockets', async () => {
      chatCache.seedOnlineStatus('user-1', {
        isOnline: true,
        lastSeen: new Date().toISOString(),
      });

      const isOnline = await gateway.isUserOnlineCached('user-1');

      expect(isOnline).toBe(true);
    });

    it('should return false when not in cache or local', async () => {
      const isOnline = await gateway.isUserOnlineCached('user-1');

      expect(isOnline).toBe(false);
    });
  });

  describe('notifyUser', () => {
    it('should emit event to user room', () => {
      const broadcastOperator = createMockBroadcastOperator();
      gateway.server.to = mock(() => broadcastOperator);

      gateway.notifyUser('user-1', 'test-event', { data: 'test' });

      expect(gateway.server.to).toHaveBeenCalledWith('user:user-1');
      expect(broadcastOperator.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
    });
  });
});
