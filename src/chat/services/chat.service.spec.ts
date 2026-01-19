import { Test, TestingModule } from '@nestjs/testing';
import {
  BusinessRuleError,
  PermissionDeniedError,
} from '@octopus-synapse/profile-contracts';
import { ChatService } from './chat.service';
import { ConversationRepository } from '../repositories/conversation.repository';
import { MessageRepository } from '../repositories/message.repository';
import { BlockedUserRepository } from '../repositories/blocked-user.repository';

describe('ChatService', () => {
  let service: ChatService;
  let conversationRepo: jest.Mocked<ConversationRepository>;
  let messageRepo: jest.Mocked<MessageRepository>;
  let blockedUserRepo: jest.Mocked<BlockedUserRepository>;

  const mockUser1 = {
    id: 'user1',
    displayName: 'User 1',
    photoURL: null,
    username: 'user1',
  };
  const mockUser2 = {
    id: 'user2',
    displayName: 'User 2',
    photoURL: null,
    username: 'user2',
  };

  const mockConversation = {
    id: 'conv1',
    participant1Id: 'user1',
    participant2Id: 'user2',
    participant1: mockUser1,
    participant2: mockUser2,
    lastMessageContent: null,
    lastMessageAt: null,
    lastMessageSenderId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMessage = {
    id: 'msg1',
    conversationId: 'conv1',
    senderId: 'user1',
    content: 'Hello!',
    isRead: false,
    readAt: null,
    createdAt: new Date(),
    sender: mockUser1,
  };

  beforeEach(async () => {
    const mockConversationRepo = {
      findOrCreate: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      updateLastMessage: jest.fn(),
      isParticipant: jest.fn(),
      getOtherParticipant: jest.fn(),
    };

    const mockMessageRepo = {
      create: jest.fn(),
      findByConversationId: jest.fn(),
      markAsRead: jest.fn(),
      markConversationAsRead: jest.fn(),
      getUnreadCount: jest.fn(),
      getUnreadCountByConversation: jest.fn(),
    };

    const mockBlockedUserRepo = {
      isBlockedBetween: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: ConversationRepository, useValue: mockConversationRepo },
        { provide: MessageRepository, useValue: mockMessageRepo },
        { provide: BlockedUserRepository, useValue: mockBlockedUserRepo },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    conversationRepo = module.get(ConversationRepository);
    messageRepo = module.get(MessageRepository);
    blockedUserRepo = module.get(BlockedUserRepository);
  });

  describe('sendMessage', () => {
    it('should send a message to a user', async () => {
      blockedUserRepo.isBlockedBetween.mockResolvedValue(false);
      conversationRepo.findOrCreate.mockResolvedValue(mockConversation);
      messageRepo.create.mockResolvedValue(mockMessage);
      conversationRepo.updateLastMessage.mockResolvedValue(mockConversation);

      const result = await service.sendMessage('user1', {
        recipientId: 'user2',
        content: 'Hello!',
      });

      expect(result).toBeDefined();
      expect(result.content).toBe('Hello!');
      expect(blockedUserRepo.isBlockedBetween).toHaveBeenCalledWith(
        'user1',
        'user2',
      );
      expect(conversationRepo.findOrCreate).toHaveBeenCalledWith(
        'user1',
        'user2',
      );
      expect(messageRepo.create).toHaveBeenCalled();
    });

    it('should throw PermissionDeniedError if users are blocked', async () => {
      blockedUserRepo.isBlockedBetween.mockResolvedValue(true);

      await expect(
        service.sendMessage('user1', {
          recipientId: 'user2',
          content: 'Hello!',
        }),
      ).rejects.toThrow(PermissionDeniedError);
    });

    it('should throw BusinessRuleError when messaging yourself', async () => {
      blockedUserRepo.isBlockedBetween.mockResolvedValue(false);

      await expect(
        service.sendMessage('user1', {
          recipientId: 'user1',
          content: 'Hello!',
        }),
      ).rejects.toThrow(BusinessRuleError);
    });
  });

  describe('sendMessageToConversation', () => {
    it('should send a message to an existing conversation', async () => {
      conversationRepo.isParticipant.mockResolvedValue(true);
      conversationRepo.getOtherParticipant.mockResolvedValue(mockUser2);
      blockedUserRepo.isBlockedBetween.mockResolvedValue(false);
      messageRepo.create.mockResolvedValue(mockMessage);
      conversationRepo.updateLastMessage.mockResolvedValue(mockConversation);

      const result = await service.sendMessageToConversation(
        'user1',
        'conv1',
        'Hello!',
      );

      expect(result).toBeDefined();
      expect(result.content).toBe('Hello!');
    });

    it('should throw PermissionDeniedError if not a participant', async () => {
      conversationRepo.isParticipant.mockResolvedValue(false);

      await expect(
        service.sendMessageToConversation('user3', 'conv1', 'Hello!'),
      ).rejects.toThrow(PermissionDeniedError);
    });

    it('should throw PermissionDeniedError if blocked', async () => {
      conversationRepo.isParticipant.mockResolvedValue(true);
      conversationRepo.getOtherParticipant.mockResolvedValue(mockUser2);
      blockedUserRepo.isBlockedBetween.mockResolvedValue(true);

      await expect(
        service.sendMessageToConversation('user1', 'conv1', 'Hello!'),
      ).rejects.toThrow(PermissionDeniedError);
    });
  });

  describe('getMessages', () => {
    it('should return messages for a conversation', async () => {
      conversationRepo.isParticipant.mockResolvedValue(true);
      messageRepo.findByConversationId.mockResolvedValue({
        messages: [mockMessage],
        nextCursor: null,
        hasMore: false,
      });

      const result = await service.getMessages('user1', {
        conversationId: 'conv1',
        limit: 50,
      });

      expect(result.messages).toHaveLength(1);
      expect(result.hasMore).toBe(false);
    });

    it('should throw PermissionDeniedError if not a participant', async () => {
      conversationRepo.isParticipant.mockResolvedValue(false);

      await expect(
        service.getMessages('user3', { conversationId: 'conv1', limit: 50 }),
      ).rejects.toThrow(PermissionDeniedError);
    });
  });

  describe('getConversations', () => {
    it('should return conversations for a user', async () => {
      conversationRepo.findByUserId.mockResolvedValue({
        conversations: [mockConversation],
        nextCursor: null,
        hasMore: false,
      });
      messageRepo.getUnreadCountByConversation.mockResolvedValue(0);

      const result = await service.getConversations('user1', { limit: 20 });

      expect(result.conversations).toHaveLength(1);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('markConversationAsRead', () => {
    it('should mark all messages as read', async () => {
      conversationRepo.isParticipant.mockResolvedValue(true);
      messageRepo.markConversationAsRead.mockResolvedValue({ count: 5 });

      const result = await service.markConversationAsRead('user1', 'conv1');

      expect(result.count).toBe(5);
    });

    it('should throw PermissionDeniedError if not a participant', async () => {
      conversationRepo.isParticipant.mockResolvedValue(false);

      await expect(
        service.markConversationAsRead('user3', 'conv1'),
      ).rejects.toThrow(PermissionDeniedError);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count for a user', async () => {
      messageRepo.getUnreadCount.mockResolvedValue({
        totalUnread: 10,
        byConversation: { conv1: 5, conv2: 5 },
      });

      const result = await service.getUnreadCount('user1');

      expect(result.totalUnread).toBe(10);
      expect(result.byConversation).toHaveProperty('conv1');
    });
  });
});
