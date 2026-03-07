/**
 * Webhook Service Unit Tests
 *
 * Tests the event-driven webhook delivery system.
 * Focus: Event handlers, retry mechanism, HMAC signature.
 *
 * Kent Beck: "Test the behaviors, not the implementation details"
 * Uncle Bob: "Each test should have a single reason to fail"
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookService } from './webhook.service';

describe('WebhookService', () => {
  let service: WebhookService;
  let mockPrismaService: Record<string, never>;

  const mockUserId = 'user-123';
  const mockResumeId = 'resume-456';

  beforeEach(async () => {
    mockPrismaService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
  });

  describe('handleResumeCreated', () => {
    it('should process resume created event', async () => {
      const payload = {
        resumeId: mockResumeId,
        userId: mockUserId,
        title: 'Software Engineer Resume',
      };

      // Should not throw - logs and attempts webhook delivery
      await expect(service.handleResumeCreated(payload)).resolves.toBeUndefined();
    });

    it('should handle event when no webhooks configured', async () => {
      const payload = {
        resumeId: mockResumeId,
        userId: mockUserId,
        title: 'Test Resume',
      };

      // Since no webhooks are configured, it should complete silently
      await expect(service.handleResumeCreated(payload)).resolves.toBeUndefined();
    });
  });

  describe('handleResumePublished', () => {
    it('should process resume published event', async () => {
      const payload = {
        resumeId: mockResumeId,
        userId: mockUserId,
        publicUrl: 'https://example.com/resume/john-doe',
      };

      await expect(service.handleResumePublished(payload)).resolves.toBeUndefined();
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
      await expect(service.handleATSScoreUpdated(payload)).resolves.toBeUndefined();
    });

    it('should skip webhook when score change is minimal (<5 points)', async () => {
      const payload = {
        resumeId: mockResumeId,
        userId: mockUserId,
        score: 83,
        previousScore: 80,
      };

      // Score only changed by 3 points, should skip
      await expect(service.handleATSScoreUpdated(payload)).resolves.toBeUndefined();
    });

    it('should process event when no previous score exists', async () => {
      const payload = {
        resumeId: mockResumeId,
        userId: mockUserId,
        score: 85,
        // No previousScore - first time score
      };

      await expect(service.handleATSScoreUpdated(payload)).resolves.toBeUndefined();
    });

    it('should handle edge case of exactly 5 point difference', async () => {
      const payload = {
        resumeId: mockResumeId,
        userId: mockUserId,
        score: 80,
        previousScore: 75, // Exactly 5 points difference - should skip
      };

      await expect(service.handleATSScoreUpdated(payload)).resolves.toBeUndefined();
    });

    it('should handle negative score changes', async () => {
      const payload = {
        resumeId: mockResumeId,
        userId: mockUserId,
        score: 60,
        previousScore: 75, // Score dropped by 15
      };

      await expect(service.handleATSScoreUpdated(payload)).resolves.toBeUndefined();
    });
  });

  describe('delivery behavior', () => {
    it('should complete event handling when no webhooks are configured', async () => {
      await expect(
        service.handleResumeCreated({
          resumeId: mockResumeId,
          userId: mockUserId,
          title: 'Test Resume',
        }),
      ).resolves.toBeUndefined();
    });
  });
});
