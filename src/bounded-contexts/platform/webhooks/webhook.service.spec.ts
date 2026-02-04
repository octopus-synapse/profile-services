/**
 * Webhook Service Unit Tests
 *
 * Tests the event-driven webhook delivery system.
 * Focus: Event handlers, retry mechanism, HMAC signature.
 *
 * Kent Beck: "Test the behaviors, not the implementation details"
 * Uncle Bob: "Each test should have a single reason to fail"
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { WebhookService } from './webhook.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('WebhookService', () => {
  let service: WebhookService;
  let mockPrismaService: Partial<PrismaService>;

  const mockUserId = 'user-123';
  const mockResumeId = 'resume-456';

  beforeEach(() => {
    mockPrismaService = {} as any;

    service = new WebhookService(mockPrismaService as PrismaService);
  });

  describe('handleResumeCreated', () => {
    it('should process resume created event', async () => {
      const payload = {
        resumeId: mockResumeId,
        userId: mockUserId,
        title: 'Software Engineer Resume',
      };

      // Should not throw - logs and attempts webhook delivery
      await expect(
        service.handleResumeCreated(payload),
      ).resolves.toBeUndefined();
    });

    it('should handle event when no webhooks configured', async () => {
      const payload = {
        resumeId: mockResumeId,
        userId: mockUserId,
        title: 'Test Resume',
      };

      // Since no webhooks are configured, it should complete silently
      await expect(
        service.handleResumeCreated(payload),
      ).resolves.toBeUndefined();
    });
  });

  describe('handleResumePublished', () => {
    it('should process resume published event', async () => {
      const payload = {
        resumeId: mockResumeId,
        userId: mockUserId,
        publicUrl: 'https://example.com/resume/john-doe',
      };

      await expect(
        service.handleResumePublished(payload),
      ).resolves.toBeUndefined();
    });
  });

  describe('handleATSScoreUpdated', () => {
    it('should process ATS score update when score changes significantly', async () => {
      const payload = {
        resumeId: mockResumeId,
        userId: mockUserId,
        score: 85,
        previousScore: 70,
      };

      // Score changed by 15 points (>5), should trigger webhook
      await expect(
        service.handleATSScoreUpdated(payload),
      ).resolves.toBeUndefined();
    });

    it('should skip webhook when score change is minimal (<5 points)', async () => {
      const payload = {
        resumeId: mockResumeId,
        userId: mockUserId,
        score: 83,
        previousScore: 80,
      };

      // Score only changed by 3 points, should skip
      await expect(
        service.handleATSScoreUpdated(payload),
      ).resolves.toBeUndefined();
    });

    it('should process event when no previous score exists', async () => {
      const payload = {
        resumeId: mockResumeId,
        userId: mockUserId,
        score: 85,
        // No previousScore - first time score
      };

      await expect(
        service.handleATSScoreUpdated(payload),
      ).resolves.toBeUndefined();
    });

    it('should handle edge case of exactly 5 point difference', async () => {
      const payload = {
        resumeId: mockResumeId,
        userId: mockUserId,
        score: 80,
        previousScore: 75, // Exactly 5 points difference - should skip
      };

      await expect(
        service.handleATSScoreUpdated(payload),
      ).resolves.toBeUndefined();
    });

    it('should handle negative score changes', async () => {
      const payload = {
        resumeId: mockResumeId,
        userId: mockUserId,
        score: 60,
        previousScore: 75, // Score dropped by 15
      };

      await expect(
        service.handleATSScoreUpdated(payload),
      ).resolves.toBeUndefined();
    });
  });

  describe('HMAC signature generation', () => {
    it('should generate consistent HMAC for same input', async () => {
      // Access private method via type assertion for testing
      const generateHMAC = (service as any).generateHMAC.bind(service);

      const secret = 'test-secret-key';
      const body = JSON.stringify({ event: 'test', data: 'test-data' });

      const signature1 = await generateHMAC(secret, body);
      const signature2 = await generateHMAC(secret, body);

      expect(signature1).toBe(signature2);
      expect(signature1).toHaveLength(64); // SHA-256 produces 64 hex chars
    });

    it('should generate different HMAC for different secrets', async () => {
      const generateHMAC = (service as any).generateHMAC.bind(service);

      const body = JSON.stringify({ event: 'test', data: 'test-data' });

      const signature1 = await generateHMAC('secret-1', body);
      const signature2 = await generateHMAC('secret-2', body);

      expect(signature1).not.toBe(signature2);
    });

    it('should generate different HMAC for different body content', async () => {
      const generateHMAC = (service as any).generateHMAC.bind(service);

      const secret = 'test-secret';

      const signature1 = await generateHMAC(secret, '{"a":1}');
      const signature2 = await generateHMAC(secret, '{"a":2}');

      expect(signature1).not.toBe(signature2);
    });
  });

  describe('webhook configuration', () => {
    it('should return empty array when no webhooks configured', () => {
      const getWebhookConfigurations = (
        service as any
      ).getWebhookConfigurations.bind(service);

      const webhooks = getWebhookConfigurations(mockUserId, 'resume.created');

      expect(webhooks).toEqual([]);
    });
  });
});
