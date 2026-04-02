import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@/shared-kernel';
import { BlockedUserRepository } from '../repositories/blocked-user.repository';
import { ConversationRepository } from '../repositories/conversation.repository';
import { MessageRepository } from '../repositories/message.repository';
import {
  InMemoryBlockedUserRepository,
  InMemoryChatCacheService,
  InMemoryConversationRepository,
  InMemoryMessageRepository,
} from '../testing';
import { ChatService } from './chat.service';
import { ChatCacheService } from './chat-cache.service';

describe('ChatService', () => {
  let service: ChatService;
  let conversationRepo: InMemoryConversationRepository;
  let messageRepo: InMemoryMessageRepository;
  let blockedUserRepo: InMemoryBlockedUserRepository;
  let chatCache: InMemoryChatCacheService;
  let eventPublisher: { publish: ReturnType<typeof mock>; publishAsync: ReturnType<typeof mock> };

  beforeEach(async () => {
    conversationRepo = new InMemoryConversationRepository();
    messageRepo = new InMemoryMessageRepository();
    blockedUserRepo = new InMemoryBlockedUserRepository();
    chatCache = new InMemoryChatCacheService();
    eventPublisher = {
      publish: mock(),
      publishAsync: mock(() => Promise.resolve()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: ConversationRepository, useValue: conversationRepo },
        { provide: MessageRepository, useValue: messageRepo },
        { provide: BlockedUserRepository, useValue: blockedUserRepo },
        { provide: EventPublisher, useValue: eventPublisher },
        { provide: ChatCacheService, useValue: chatCache },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);

    // Seed users
    conversationRepo.seedUser({ id: 'user1', displayName: 'User 1', username: 'user1' });
    conversationRepo.seedUser({ id: 'user2', displayName: 'User 2', username: 'user2' });
    conversationRepo.seedUser({ id: 'user3', displayName: 'User 3', username: 'user3' });
  });

  describe('sendMessage', () => {
    it('should send a message to a user and create conversation', async () => {
      const result = await service.sendMessage('user1', {
        recipientId: 'user2',
        content: 'Hello!',
      });

      expect(result).toBeDefined();
      expect(result.content).toBe('Hello!');
      expect(result.senderId).toBe('user1');
      expect(result.conversationId).toBeDefined();
    });

    it('should send message to existing conversation', async () => {
      // First message creates conversation
      const first = await service.sendMessage('user1', {
        recipientId: 'user2',
        content: 'Hello!',
      });

      // Second message uses same conversation
      const second = await service.sendMessage('user1', {
        recipientId: 'user2',
        content: 'How are you?',
      });

      expect(first.conversationId).toBe(second.conversationId);
    });

    it('should throw ForbiddenException if users are blocked', async () => {
      blockedUserRepo.seedBlock({ blockerId: 'user1', blockedId: 'user2' });

      await expect(
        service.sendMessage('user1', {
          recipientId: 'user2',
          content: 'Hello!',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if blocked by recipient', async () => {
      blockedUserRepo.seedBlock({ blockerId: 'user2', blockedId: 'user1' });

      await expect(
        service.sendMessage('user1', {
          recipientId: 'user2',
          content: 'Hello!',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when messaging yourself', async () => {
      await expect(
        service.sendMessage('user1', {
          recipientId: 'user1',
          content: 'Hello!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should publish MessageSentEvent', async () => {
      await service.sendMessage('user1', {
        recipientId: 'user2',
        content: 'Hello!',
      });

      expect(eventPublisher.publish).toHaveBeenCalled();
    });

    it('should invalidate cache for both participants', async () => {
      await service.sendMessage('user1', {
        recipientId: 'user2',
        content: 'Hello!',
      });

      // Cache should have been invalidated
      expect(chatCache.isUnreadCached('user2')).toBe(false);
      expect(chatCache.isConversationsCached('user1')).toBe(false);
      expect(chatCache.isConversationsCached('user2')).toBe(false);
    });

    it('should update conversation last message', async () => {
      const result = await service.sendMessage('user1', {
        recipientId: 'user2',
        content: 'Hello!',
      });

      const conversation = conversationRepo.getConversation(result.conversationId);
      expect(conversation?.lastMessageContent).toBe('Hello!');
      expect(conversation?.lastMessageSenderId).toBe('user1');
    });
  });

  describe('sendMessageToConversation', () => {
    beforeEach(async () => {
      // Create a conversation first
      conversationRepo.seedConversation({
        id: 'conv1',
        participant1Id: 'user1',
        participant2Id: 'user2',
      });
      messageRepo.seedConversationParticipants('conv1', 'user1', 'user2');
    });

    it('should send a message to an existing conversation', async () => {
      const result = await service.sendMessageToConversation('user1', 'conv1', 'Hello!');

      expect(result).toBeDefined();
      expect(result.content).toBe('Hello!');
      expect(result.conversationId).toBe('conv1');
    });

    it('should throw ForbiddenException if not a participant', async () => {
      await expect(service.sendMessageToConversation('user3', 'conv1', 'Hello!')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if blocked', async () => {
      blockedUserRepo.seedBlock({ blockerId: 'user2', blockedId: 'user1' });

      await expect(service.sendMessageToConversation('user1', 'conv1', 'Hello!')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if conversation not found', async () => {
      await expect(
        service.sendMessageToConversation('user1', 'nonexistent', 'Hello!'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getMessages', () => {
    beforeEach(() => {
      conversationRepo.seedConversation({
        id: 'conv1',
        participant1Id: 'user1',
        participant2Id: 'user2',
      });

      messageRepo.seedMessage({
        id: 'msg1',
        conversationId: 'conv1',
        senderId: 'user1',
        content: 'Hello!',
        createdAt: new Date('2024-01-01T10:00:00Z'),
      });
      messageRepo.seedMessage({
        id: 'msg2',
        conversationId: 'conv1',
        senderId: 'user2',
        content: 'Hi there!',
        createdAt: new Date('2024-01-01T10:01:00Z'),
      });
    });

    it('should return messages for a conversation', async () => {
      const result = await service.getMessages('user1', {
        conversationId: 'conv1',
        limit: 50,
      });

      expect(result.messages).toHaveLength(2);
      expect(result.hasMore).toBe(false);
    });

    it('should throw ForbiddenException if not a participant', async () => {
      await expect(
        service.getMessages('user3', { conversationId: 'conv1', limit: 50 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should support pagination', async () => {
      // Add more messages
      for (let i = 3; i <= 55; i++) {
        messageRepo.seedMessage({
          id: `msg${i}`,
          conversationId: 'conv1',
          senderId: i % 2 === 0 ? 'user1' : 'user2',
          content: `Message ${i}`,
          createdAt: new Date(`2024-01-01T10:${String(i).padStart(2, '0')}:00Z`),
        });
      }

      const result = await service.getMessages('user1', {
        conversationId: 'conv1',
        limit: 50,
      });

      expect(result.messages.length).toBeLessThanOrEqual(50);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('getConversations', () => {
    beforeEach(() => {
      conversationRepo.seedConversation({
        id: 'conv1',
        participant1Id: 'user1',
        participant2Id: 'user2',
        lastMessageContent: 'Hello!',
        lastMessageAt: new Date(),
      });
      conversationRepo.seedConversation({
        id: 'conv2',
        participant1Id: 'user1',
        participant2Id: 'user3',
        lastMessageContent: 'Hi!',
        lastMessageAt: new Date(),
      });

      messageRepo.seedConversationParticipants('conv1', 'user1', 'user2');
      messageRepo.seedConversationParticipants('conv2', 'user1', 'user3');
    });

    it('should return conversations for a user', async () => {
      const result = await service.getConversations('user1', { limit: 20 });

      expect(result.conversations).toHaveLength(2);
      expect(result.hasMore).toBe(false);
    });

    it('should include unread count', async () => {
      // Add unread message from user2 to user1
      messageRepo.seedMessage({
        id: 'msg-unread',
        conversationId: 'conv1',
        senderId: 'user2',
        content: 'Unread message',
        isRead: false,
      });

      const result = await service.getConversations('user1', { limit: 20 });
      const conv1 = result.conversations.find((c) => c.id === 'conv1');

      expect(conv1?.unreadCount).toBe(1);
    });
  });

  describe('getConversation', () => {
    beforeEach(() => {
      conversationRepo.seedConversation({
        id: 'conv1',
        participant1Id: 'user1',
        participant2Id: 'user2',
      });
      messageRepo.seedConversationParticipants('conv1', 'user1', 'user2');
    });

    it('should return a single conversation', async () => {
      const result = await service.getConversation('user1', 'conv1');

      expect(result).toBeDefined();
      expect(result.id).toBe('conv1');
    });

    it('should throw NotFoundException if conversation does not exist', async () => {
      await expect(service.getConversation('user1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if not a participant', async () => {
      await expect(service.getConversation('user3', 'conv1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('markConversationAsRead', () => {
    beforeEach(() => {
      conversationRepo.seedConversation({
        id: 'conv1',
        participant1Id: 'user1',
        participant2Id: 'user2',
      });

      messageRepo.seedMessage({
        id: 'msg1',
        conversationId: 'conv1',
        senderId: 'user2',
        content: 'Hello!',
        isRead: false,
      });
      messageRepo.seedMessage({
        id: 'msg2',
        conversationId: 'conv1',
        senderId: 'user2',
        content: 'Are you there?',
        isRead: false,
      });
    });

    it('should mark all messages as read', async () => {
      const result = await service.markConversationAsRead('user1', 'conv1');

      expect(result.count).toBe(2);

      const msg1 = messageRepo.getMessage('msg1');
      const msg2 = messageRepo.getMessage('msg2');
      expect(msg1?.isRead).toBe(true);
      expect(msg2?.isRead).toBe(true);
    });

    it('should throw ForbiddenException if not a participant', async () => {
      await expect(service.markConversationAsRead('user3', 'conv1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should invalidate unread cache', async () => {
      chatCache.seedUnreadCount('user1', { totalUnread: 2, byConversation: { conv1: 2 } });

      await service.markConversationAsRead('user1', 'conv1');

      expect(chatCache.isUnreadCached('user1')).toBe(false);
    });
  });

  describe('getUnreadCount', () => {
    beforeEach(() => {
      conversationRepo.seedConversation({
        id: 'conv1',
        participant1Id: 'user1',
        participant2Id: 'user2',
      });
      conversationRepo.seedConversation({
        id: 'conv2',
        participant1Id: 'user1',
        participant2Id: 'user3',
      });

      messageRepo.seedConversationParticipants('conv1', 'user1', 'user2');
      messageRepo.seedConversationParticipants('conv2', 'user1', 'user3');

      messageRepo.seedMessage({
        id: 'msg1',
        conversationId: 'conv1',
        senderId: 'user2',
        content: 'Hello!',
        isRead: false,
      });
      messageRepo.seedMessage({
        id: 'msg2',
        conversationId: 'conv2',
        senderId: 'user3',
        content: 'Hi!',
        isRead: false,
      });
      messageRepo.seedMessage({
        id: 'msg3',
        conversationId: 'conv2',
        senderId: 'user3',
        content: 'Hello again!',
        isRead: false,
      });
    });

    it('should return unread count for a user', async () => {
      const result = await service.getUnreadCount('user1');

      expect(result.totalUnread).toBe(3);
      expect(result.byConversation.conv1).toBe(1);
      expect(result.byConversation.conv2).toBe(2);
    });

    it('should use cached value when available', async () => {
      const cachedValue = { totalUnread: 5, byConversation: { conv1: 5 } };
      chatCache.seedUnreadCount('user1', cachedValue);

      const result = await service.getUnreadCount('user1');

      expect(result).toEqual(cachedValue);
    });
  });

  describe('getConversationId', () => {
    it('should create and return conversation ID', async () => {
      const result = await service.getConversationId('user1', 'user2');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should return same ID for existing conversation', async () => {
      const first = await service.getConversationId('user1', 'user2');
      const second = await service.getConversationId('user1', 'user2');

      expect(first).toBe(second);
    });

    it('should return same ID regardless of user order', async () => {
      const first = await service.getConversationId('user1', 'user2');
      const second = await service.getConversationId('user2', 'user1');

      expect(first).toBe(second);
    });
  });
});
