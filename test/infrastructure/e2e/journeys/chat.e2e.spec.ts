/**
 * E2E Test: Chat Journey
 *
 * Tests the complete chat flow between users.
 *
 * Flow:
 * 1. Create two users with chat permissions
 * 2. User 1 sends a message to User 2
 * 3. Verify conversation is created
 * 4. User 2 replies
 * 5. Verify message history
 * 6. Mark messages as read
 * 7. Check unread counts
 * 8. Block/unblock functionality
 *
 * Target Time: < 30 seconds
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import type { PrismaClient } from '@prisma/client';
import { stopTestApp, type TestApp } from '../../shared';
import type { AuthHelper, TestUser } from '../../shared/auth.helper';
import { ChatHelper } from '../helpers/chat.helper';
import type { CleanupHelper } from '../helpers/cleanup.helper';
import { createE2ETestApp } from '../setup';

describe('E2E Journey: Chat', () => {
  let app: TestApp; // was INestApplication
  let authHelper: AuthHelper;
  let cleanupHelper: CleanupHelper;
  let chatHelper: ChatHelper;
  let prisma: PrismaClient;

  let user1: TestUser;
  let user2: TestUser;
  let conversationId: string;

  beforeAll(async () => {
    const testApp = await createE2ETestApp();
    app = testApp.app;
    authHelper = testApp.authHelper;
    cleanupHelper = testApp.cleanupHelper;
    prisma = testApp.prisma;
    chatHelper = new ChatHelper(prisma);

    // Create two test users
    user1 = authHelper.createTestUser('chat-user1');
    const result1 = await authHelper.registerAndLogin(user1);
    user1.token = result1.token;
    user1.userId = result1.userId;

    user2 = authHelper.createTestUser('chat-user2');
    const result2 = await authHelper.registerAndLogin(user2);
    user2.token = result2.token;
    user2.userId = result2.userId;

    // Grant chat permissions to both users
    if (!user1.userId || !user2.userId) {
      throw new Error('User IDs are required after registration');
    }
    await chatHelper.grantChatPermission(user1.userId);
    await chatHelper.grantChatPermission(user2.userId);
  });

  afterAll(async () => {
    // Clean up chat data first
    if (user1?.userId && user2?.userId) {
      await chatHelper.cleanupConversationBetween(user1.userId, user2.userId);
    }

    // Then clean up users
    if (user1?.email) {
      await cleanupHelper.deleteUserByEmail(user1.email);
    }
    if (user2?.email) {
      await cleanupHelper.deleteUserByEmail(user2.email);
    }

    await stopTestApp();
  });

  describe('Step 1: Initial State', () => {
    it.serial('should have no conversations initially', async () => {
      const response = await app.request
        .get('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${user1.token}`);

      if (response.status !== 200) {
        console.log('Response body:', JSON.stringify(response.body, null, 2));
      }
      expect(response.status).toBe(200);
      expect(response.body.conversations.conversations).toHaveLength(0);
    });

    it.serial('should have zero unread count initially', async () => {
      const response = await app.request
        .get('/api/v1/chat/unread')
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.totalUnread).toBe(0);
    });
  });

  describe('Step 2: Send First Message', () => {
    it.serial('should send a message and create conversation', async () => {
      const response = await app.request
        .post('/api/v1/chat/messages')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ recipientId: user2.userId, content: 'Hello from User 1!' });

      expect(response.status).toBe(201);
      expect(response.body.message).toBeDefined();
      expect(response.body.message.content).toBe('Hello from User 1!');
      expect(response.body.message.senderId).toBe(user1.userId);
      expect(response.body.message.conversationId).toBeDefined();

      conversationId = response.body.message.conversationId;
    });

    it.serial('should reject messaging yourself', async () => {
      const response = await app.request
        .post('/api/v1/chat/messages')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ recipientId: user1.userId, content: 'Hello to myself' });

      expect(response.status).toBe(400);
    });
  });

  describe('Step 3: Verify Conversation Created', () => {
    it.serial('user1 should see the conversation', async () => {
      const response = await app.request
        .get('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.conversations.conversations.length).toBeGreaterThanOrEqual(1);

      const conv = response.body.conversations.conversations.find(
        (c: { id: string }) => c.id === conversationId,
      );
      expect(conv).toBeDefined();
      expect(conv.lastMessage?.content).toBe('Hello from User 1!');
    });

    it.serial('user2 should see the conversation', async () => {
      const response = await app.request
        .get('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${user2.token}`);

      expect(response.status).toBe(200);
      expect(response.body.conversations.conversations.length).toBeGreaterThanOrEqual(1);
    });

    it.serial('should get conversation details', async () => {
      const response = await app.request
        .get(`/api/v1/chat/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.conversation).toBeDefined();
      expect(response.body.conversation.id).toBe(conversationId);
    });

    it.serial('should get conversation with user', async () => {
      const response = await app.request
        .get(`/api/v1/chat/conversation-with/${user2.userId}`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.conversationId).toBe(conversationId);
    });
  });

  describe('Step 4: User 2 Replies', () => {
    it.serial('should send reply to existing conversation', async () => {
      const response = await app.request
        .post(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user2.token}`)
        .send({ content: 'Hello back from User 2!' });

      expect(response.status).toBe(201);
      expect(response.body.message.content).toBe('Hello back from User 2!');
      expect(response.body.message.senderId).toBe(user2.userId);
    });

    it.serial('should reject non-participant sending to conversation', async () => {
      // Create a third user
      const user3 = authHelper.createTestUser('chat-user3');
      const result3 = await authHelper.registerAndLogin(user3);
      if (!result3.userId) throw new Error('userId is required');
      await chatHelper.grantChatPermission(result3.userId);

      const response = await app.request
        .post(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${result3.token}`)
        .send({ content: 'Intruder message' });

      expect(response.status).toBe(403);

      // Cleanup third user
      await cleanupHelper.deleteUserByEmail(user3.email);
    });
  });

  describe('Step 5: Message History', () => {
    it.serial('should get messages for conversation', async () => {
      const response = await app.request
        .get(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.messages.messages).toHaveLength(2);

      const messages = response.body.messages.messages;
      expect(messages.some((m: { content: string }) => m.content === 'Hello from User 1!')).toBe(
        true,
      );
      expect(
        messages.some((m: { content: string }) => m.content === 'Hello back from User 2!'),
      ).toBe(true);
    });

    it.serial('should support pagination with limit', async () => {
      const response = await app.request
        .get(`/api/v1/chat/conversations/${conversationId}/messages`)
        .query({ limit: 1 })
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.messages.messages).toHaveLength(1);
      expect(response.body.messages.hasMore).toBe(true);
    });

    it.serial('should reject non-participant viewing messages', async () => {
      const user3 = authHelper.createTestUser('chat-user3-view');
      const result3 = await authHelper.registerAndLogin(user3);
      if (!result3.userId) throw new Error('userId is required');
      await chatHelper.grantChatPermission(result3.userId);

      const response = await app.request
        .get(`/api/v1/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${result3.token}`);

      expect(response.status).toBe(403);

      await cleanupHelper.deleteUserByEmail(user3.email);
    });
  });

  describe('Step 6: Unread Count', () => {
    it.serial('user1 should have unread messages from user2', async () => {
      const response = await app.request
        .get('/api/v1/chat/unread')
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      // User 1 has 1 unread (the reply from User 2)
      expect(response.body.totalUnread).toBe(1);
      expect(response.body.byConversation[conversationId]).toBe(1);
    });
  });

  describe('Step 7: Mark as Read', () => {
    it.serial('should mark messages as read', async () => {
      const response = await app.request
        .post(`/api/v1/chat/conversations/${conversationId}/read`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(201);
      expect(response.body.count).toBeDefined();
    });

    it.serial('should have zero unread after marking as read', async () => {
      const response = await app.request
        .get('/api/v1/chat/unread')
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.totalUnread).toBe(0);
    });
  });

  describe('Step 8: Block User', () => {
    it.serial('should block a user', async () => {
      const response = await app.request
        .post('/api/v1/chat/blocked')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ userId: user2.userId });

      expect(response.status).toBe(201);
      expect(response.body.block).toBeDefined();
    });

    it.serial('should list blocked users', async () => {
      const response = await app.request
        .get('/api/v1/chat/blocked')
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.blockedUsers).toBeDefined();
      expect(response.body.blockedUsers.length).toBeGreaterThanOrEqual(1);
    });

    it.serial('should check if user is blocked', async () => {
      const response = await app.request
        .get(`/api/v1/chat/blocked/${user2.userId}/status`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.isBlocked).toBe(true);
    });

    it.serial('should prevent sending message to blocked user', async () => {
      const response = await app.request
        .post('/api/v1/chat/messages')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ recipientId: user2.userId, content: 'Message to blocked user' });

      expect(response.status).toBe(403);
    });

    it.serial('blocked user should not be able to send messages', async () => {
      const response = await app.request
        .post('/api/v1/chat/messages')
        .set('Authorization', `Bearer ${user2.token}`)
        .send({ recipientId: user1.userId, content: 'Message from blocked user' });

      expect(response.status).toBe(403);
    });
  });

  describe('Step 9: Unblock User', () => {
    it.serial('should unblock a user', async () => {
      const response = await app.request
        .delete(`/api/v1/chat/blocked/${user2.userId}`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(204);
    });

    it.serial('should verify user is unblocked', async () => {
      const response = await app.request
        .get(`/api/v1/chat/blocked/${user2.userId}/status`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.isBlocked).toBe(false);
    });

    it.serial('should be able to send message after unblock', async () => {
      const response = await app.request
        .post('/api/v1/chat/messages')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ recipientId: user2.userId, content: 'Message after unblock' });

      expect(response.status).toBe(201);
      expect(response.body.message.content).toBe('Message after unblock');
    });
  });

  describe('Step 10: Authorization', () => {
    it.serial('should reject unauthenticated access to conversations', async () => {
      const response = await app.request.get('/api/v1/chat/conversations');

      expect(response.status).toBe(401);
    });

    it.serial('should reject unauthenticated access to messages', async () => {
      const response = await app.request
        .post('/api/v1/chat/messages')
        .send({ recipientId: user2.userId, content: 'Unauthorized message' });

      expect(response.status).toBe(401);
    });

    it.serial('should reject user without chat permission', async () => {
      // Create user and explicitly remove their roles to test permission check
      const noPermUser = authHelper.createTestUser('chat-noperm');
      const resultNoPerm = await authHelper.registerAndLogin(noPermUser);

      // Remove role assignments and legacy roles to simulate a user
      // without any permissions (chat:use comes from the `user` role).
      await prisma.userRoleAssignment.deleteMany({
        where: { userId: resultNoPerm.userId },
      });
      await prisma.user.update({
        where: { id: resultNoPerm.userId },
        data: { roles: [] },
      });

      const response = await app.request
        .get('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${resultNoPerm.token}`);

      expect(response.status).toBe(403);

      await cleanupHelper.deleteUserByEmail(noPermUser.email);
    });
  });
});
