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
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { AuthHelper, TestUser } from '../helpers/auth.helper';
import { ChatHelper } from '../helpers/chat.helper';
import type { CleanupHelper } from '../helpers/cleanup.helper';
import { createE2ETestApp } from '../setup';

describe('E2E Journey: Chat', () => {
  let app: INestApplication;
  let authHelper: AuthHelper;
  let cleanupHelper: CleanupHelper;
  let chatHelper: ChatHelper;
  let prisma: PrismaService;

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

    await app.close();
  });

  describe('Step 1: Initial State', () => {
    it('should have no conversations initially', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/chat/conversations')
        .set('Authorization', `Bearer ${user1.token}`);

      if (response.status !== 200) {
        console.log('Response body:', JSON.stringify(response.body, null, 2));
      }
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.conversations.conversations).toHaveLength(0);
    });

    it('should have zero unread count initially', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/chat/unread')
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.totalUnread).toBe(0);
    });
  });

  describe('Step 2: Send First Message', () => {
    it('should send a message and create conversation', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/chat/messages')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({
          recipientId: user2.userId,
          content: 'Hello from User 1!',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBeDefined();
      expect(response.body.data.message.content).toBe('Hello from User 1!');
      expect(response.body.data.message.senderId).toBe(user1.userId);
      expect(response.body.data.message.conversationId).toBeDefined();

      conversationId = response.body.data.message.conversationId;
    });

    it('should reject messaging yourself', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/chat/messages')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({
          recipientId: user1.userId,
          content: 'Hello to myself',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Step 3: Verify Conversation Created', () => {
    it('user1 should see the conversation', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/chat/conversations')
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.conversations.conversations.length).toBeGreaterThanOrEqual(1);

      const conv = response.body.data.conversations.conversations.find(
        (c: { id: string }) => c.id === conversationId,
      );
      expect(conv).toBeDefined();
      expect(conv.lastMessage?.content).toBe('Hello from User 1!');
    });

    it('user2 should see the conversation', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/chat/conversations')
        .set('Authorization', `Bearer ${user2.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.conversations.conversations.length).toBeGreaterThanOrEqual(1);
    });

    it('should get conversation details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/chat/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.conversation).toBeDefined();
      expect(response.body.data.conversation.id).toBe(conversationId);
    });

    it('should get conversation with user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/chat/conversation-with/${user2.userId}`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.conversationId).toBe(conversationId);
    });
  });

  describe('Step 4: User 2 Replies', () => {
    it('should send reply to existing conversation', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user2.token}`)
        .send({
          content: 'Hello back from User 2!',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.message.content).toBe('Hello back from User 2!');
      expect(response.body.data.message.senderId).toBe(user2.userId);
    });

    it('should reject non-participant sending to conversation', async () => {
      // Create a third user
      const user3 = authHelper.createTestUser('chat-user3');
      const result3 = await authHelper.registerAndLogin(user3);
      if (!result3.userId) throw new Error('userId is required');
      await chatHelper.grantChatPermission(result3.userId);

      const response = await request(app.getHttpServer())
        .post(`/api/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${result3.token}`)
        .send({
          content: 'Intruder message',
        });

      expect(response.status).toBe(403);

      // Cleanup third user
      await cleanupHelper.deleteUserByEmail(user3.email);
    });
  });

  describe('Step 5: Message History', () => {
    it('should get messages for conversation', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.messages.messages).toHaveLength(2);

      const messages = response.body.data.messages.messages;
      expect(messages.some((m: { content: string }) => m.content === 'Hello from User 1!')).toBe(
        true,
      );
      expect(
        messages.some((m: { content: string }) => m.content === 'Hello back from User 2!'),
      ).toBe(true);
    });

    it('should support pagination with limit', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/chat/conversations/${conversationId}/messages`)
        .query({ limit: 1 })
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.messages.messages).toHaveLength(1);
      expect(response.body.data.messages.hasMore).toBe(true);
    });

    it('should reject non-participant viewing messages', async () => {
      const user3 = authHelper.createTestUser('chat-user3-view');
      const result3 = await authHelper.registerAndLogin(user3);
      if (!result3.userId) throw new Error('userId is required');
      await chatHelper.grantChatPermission(result3.userId);

      const response = await request(app.getHttpServer())
        .get(`/api/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${result3.token}`);

      expect(response.status).toBe(403);

      await cleanupHelper.deleteUserByEmail(user3.email);
    });
  });

  describe('Step 6: Unread Count', () => {
    it('user1 should have unread messages from user2', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/chat/unread')
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      // User 1 has 1 unread (the reply from User 2)
      expect(response.body.data.totalUnread).toBe(1);
      expect(response.body.data.byConversation[conversationId]).toBe(1);
    });
  });

  describe('Step 7: Mark as Read', () => {
    it('should mark messages as read', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/chat/conversations/${conversationId}/read`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(201);
      expect(response.body.data.count).toBeDefined();
    });

    it('should have zero unread after marking as read', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/chat/unread')
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.totalUnread).toBe(0);
    });
  });

  describe('Step 8: Block User', () => {
    it('should block a user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/chat/blocked')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({
          userId: user2.userId,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.block).toBeDefined();
    });

    it('should list blocked users', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/chat/blocked')
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.blockedUsers).toBeDefined();
      expect(response.body.data.blockedUsers.length).toBeGreaterThanOrEqual(1);
    });

    it('should check if user is blocked', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/chat/blocked/${user2.userId}/status`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.isBlocked).toBe(true);
    });

    it('should prevent sending message to blocked user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/chat/messages')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({
          recipientId: user2.userId,
          content: 'Message to blocked user',
        });

      expect(response.status).toBe(403);
    });

    it('blocked user should not be able to send messages', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/chat/messages')
        .set('Authorization', `Bearer ${user2.token}`)
        .send({
          recipientId: user1.userId,
          content: 'Message from blocked user',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Step 9: Unblock User', () => {
    it('should unblock a user', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/chat/blocked/${user2.userId}`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(204);
    });

    it('should verify user is unblocked', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/chat/blocked/${user2.userId}/status`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.isBlocked).toBe(false);
    });

    it('should be able to send message after unblock', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/chat/messages')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({
          recipientId: user2.userId,
          content: 'Message after unblock',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.message.content).toBe('Message after unblock');
    });
  });

  describe('Step 10: Authorization', () => {
    it('should reject unauthenticated access to conversations', async () => {
      const response = await request(app.getHttpServer()).get('/api/chat/conversations');

      expect(response.status).toBe(401);
    });

    it('should reject unauthenticated access to messages', async () => {
      const response = await request(app.getHttpServer()).post('/api/chat/messages').send({
        recipientId: user2.userId,
        content: 'Unauthorized message',
      });

      expect(response.status).toBe(401);
    });

    it('should reject user without chat permission', async () => {
      // Create user and explicitly remove their roles to test permission check
      const noPermUser = authHelper.createTestUser('chat-noperm');
      const resultNoPerm = await authHelper.registerAndLogin(noPermUser);

      // Remove roles from user to simulate a user without chat permission
      await prisma.user.update({
        where: { id: resultNoPerm.userId },
        data: { roles: [] },
      });

      const response = await request(app.getHttpServer())
        .get('/api/chat/conversations')
        .set('Authorization', `Bearer ${resultNoPerm.token}`);

      expect(response.status).toBe(403);

      await cleanupHelper.deleteUserByEmail(noPermUser.email);
    });
  });
});
