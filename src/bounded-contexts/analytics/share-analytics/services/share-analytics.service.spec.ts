/**
 * ShareAnalyticsService Unit Tests
 *
 * Pure tests using in-memory repository (no mocks).
 *
 * Tests share analytics functionality:
 * - Event tracking (VIEW, DOWNLOAD)
 * - IP anonymization (GDPR)
 * - Analytics aggregation
 * - Geo tracking
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import {
  EntityNotFoundException,
  ForbiddenException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import { InMemoryShareAnalyticsRepository } from '../testing';
import { ShareAnalyticsService } from './share-analytics.service';

describe('ShareAnalyticsService', () => {
  let service: ShareAnalyticsService;
  let repository: InMemoryShareAnalyticsRepository;

  // Test data
  const userId = 'user-123';
  const shareId = 'share-123';
  const resumeId = 'resume-123';

  beforeEach(() => {
    repository = new InMemoryShareAnalyticsRepository();
    service = new ShareAnalyticsService(repository);

    // Seed a share with owner
    repository.seedShare({
      id: shareId,
      resumeId,
      resume: { userId },
    });
  });

  describe('Event Tracking', () => {
    it('should track VIEW event', async () => {
      const result = await service.trackEvent({
        shareId,
        event: 'VIEW',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        referer: 'https://linkedin.com',
      });

      expect(result.shareId).toBe(shareId);
      expect(result.event).toBe('VIEW');
      expect(repository.getAll()).toHaveLength(1);
    });

    it('should track DOWNLOAD event', async () => {
      const result = await service.trackEvent({
        shareId,
        event: 'DOWNLOAD',
        ip: '192.168.1.1',
      });

      expect(result.event).toBe('DOWNLOAD');
      expect(repository.getAll()).toHaveLength(1);
    });

    it('should include user agent when provided', async () => {
      const result = await service.trackEvent({
        shareId,
        event: 'VIEW',
        ip: '192.168.1.1',
        userAgent: 'Chrome/120.0',
      });

      expect(result.userAgent).toBe('Chrome/120.0');
    });

    it('should include referer when provided', async () => {
      const result = await service.trackEvent({
        shareId,
        event: 'VIEW',
        ip: '192.168.1.1',
        referer: 'https://google.com',
      });

      expect(result.referer).toBe('https://google.com');
    });

    it('should include geo data when provided', async () => {
      const result = await service.trackEvent({
        shareId,
        event: 'VIEW',
        ip: '192.168.1.1',
        country: 'US',
        city: 'New York',
      });

      expect(result.country).toBe('US');
      expect(result.city).toBe('New York');
    });
  });

  describe('IP Anonymization (GDPR)', () => {
    it('should hash IP address with SHA-256', async () => {
      const result = await service.trackEvent({
        shareId,
        event: 'VIEW',
        ip: '192.168.1.1',
      });

      // SHA-256 hash is 64 characters
      expect(result.ipHash).toHaveLength(64);
      expect(result.ipHash).not.toBe('192.168.1.1');
    });

    it('should generate different hashes for different IPs', async () => {
      const result1 = await service.trackEvent({
        shareId,
        event: 'VIEW',
        ip: '192.168.1.1',
      });

      const result2 = await service.trackEvent({
        shareId,
        event: 'VIEW',
        ip: '192.168.1.2',
      });

      expect(result1.ipHash).not.toBe(result2.ipHash);
    });

    it('should generate same hash for same IP (unique visitor tracking)', async () => {
      const result1 = await service.trackEvent({
        shareId,
        event: 'VIEW',
        ip: '192.168.1.1',
      });

      const result2 = await service.trackEvent({
        shareId,
        event: 'VIEW',
        ip: '192.168.1.1',
      });

      expect(result1.ipHash).toBe(result2.ipHash);
    });
  });

  describe('Analytics Retrieval', () => {
    it('should get analytics for share owner', async () => {
      // Seed analytics data
      repository.seedAnalytics({ shareId, event: 'VIEW', ipHash: 'hash1' });
      repository.seedAnalytics({ shareId, event: 'VIEW', ipHash: 'hash2' });
      repository.seedAnalytics({ shareId, event: 'DOWNLOAD', ipHash: 'hash1' });

      const result = await service.getAnalytics(shareId, userId);

      expect(result.totalViews).toBe(2);
      expect(result.totalDownloads).toBe(1);
    });

    it('should throw EntityNotFoundException when share not found', async () => {
      await expect(service.getAnalytics('non-existent-share', userId)).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it('should throw ForbiddenException when user does not own resume', async () => {
      await expect(service.getAnalytics(shareId, 'other-user')).rejects.toThrow(ForbiddenException);
    });

    it('should calculate unique views from unique IP hashes', async () => {
      // 3 unique IPs, 6 total views
      repository.seedAnalytics({ shareId, event: 'VIEW', ipHash: 'hash1' });
      repository.seedAnalytics({ shareId, event: 'VIEW', ipHash: 'hash1' });
      repository.seedAnalytics({ shareId, event: 'VIEW', ipHash: 'hash2' });
      repository.seedAnalytics({ shareId, event: 'VIEW', ipHash: 'hash2' });
      repository.seedAnalytics({ shareId, event: 'VIEW', ipHash: 'hash3' });
      repository.seedAnalytics({ shareId, event: 'VIEW', ipHash: 'hash3' });

      const result = await service.getAnalytics(shareId, userId);

      expect(result.uniqueVisitors).toBe(3);
    });

    it('should group analytics by country', async () => {
      repository.seedAnalytics({
        shareId,
        event: 'VIEW',
        ipHash: 'h1',
        country: 'BR',
      });
      repository.seedAnalytics({
        shareId,
        event: 'VIEW',
        ipHash: 'h2',
        country: 'BR',
      });
      repository.seedAnalytics({
        shareId,
        event: 'VIEW',
        ipHash: 'h3',
        country: 'US',
      });

      const result = await service.getAnalytics(shareId, userId);

      expect(result.byCountry).toContainEqual({ country: 'BR', count: 2 });
      expect(result.byCountry).toContainEqual({ country: 'US', count: 1 });
    });

    it('should return recent events', async () => {
      repository.seedAnalytics({
        shareId,
        event: 'VIEW',
        ipHash: 'h1',
        country: 'BR',
        city: 'São Paulo',
      });

      const result = await service.getAnalytics(shareId, userId);

      expect(result.recentEvents).toHaveLength(1);
      expect(result.recentEvents[0].event).toBe('VIEW');
    });

    it('should return 0 views when no events', async () => {
      const result = await service.getAnalytics(shareId, userId);

      expect(result.totalViews).toBe(0);
      expect(result.totalDownloads).toBe(0);
      expect(result.uniqueVisitors).toBe(0);
    });
  });

  describe('Events Retrieval', () => {
    it('should get events for share owner', async () => {
      repository.seedAnalytics({
        shareId,
        event: 'VIEW',
        ipHash: 'hash1',
        userAgent: 'Mozilla/5.0',
        referer: 'https://linkedin.com',
        country: 'BR',
        city: 'São Paulo',
      });

      const events = await service.getEvents(shareId, userId);

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('VIEW');
      expect(events[0].ipAddress).toBe('hash1');
      expect(events[0].userAgent).toBe('Mozilla/5.0');
      expect(events[0].referrer).toBe('https://linkedin.com');
      expect(events[0].country).toBe('BR');
      expect(events[0].city).toBe('São Paulo');
    });

    it('should filter events by type', async () => {
      repository.seedAnalytics({ shareId, event: 'VIEW', ipHash: 'h1' });
      repository.seedAnalytics({ shareId, event: 'VIEW', ipHash: 'h2' });
      repository.seedAnalytics({ shareId, event: 'DOWNLOAD', ipHash: 'h3' });

      const events = await service.getEvents(shareId, userId, {
        eventType: 'DOWNLOAD',
      });

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('DOWNLOAD');
    });

    it('should throw ForbiddenException when user does not own share', async () => {
      await expect(service.getEvents(shareId, 'other-user')).rejects.toThrow(ForbiddenException);
    });
  });
});
