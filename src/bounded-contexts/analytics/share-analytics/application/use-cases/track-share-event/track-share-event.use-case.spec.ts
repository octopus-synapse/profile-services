/**
 * TrackShareEventUseCase - Unit Tests
 *
 * Contract tests for the track share event use case.
 * Verifies IP anonymization (GDPR) and delegation to repository.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryShareAnalyticsRepository } from '../../../testing';
import { TrackShareEventUseCase } from './track-share-event.use-case';

describe('TrackShareEventUseCase', () => {
  let useCase: TrackShareEventUseCase;
  let repository: InMemoryShareAnalyticsRepository;

  beforeEach(() => {
    repository = new InMemoryShareAnalyticsRepository();
    useCase = new TrackShareEventUseCase(repository);
  });

  it('should create an analytics record with hashed IP', async () => {
    const result = await useCase.execute({
      shareId: 'share-1',
      event: 'VIEW',
      ip: '192.168.1.1',
    });

    expect(result.shareId).toBe('share-1');
    expect(result.event).toBe('VIEW');
    expect(result.ipHash).toHaveLength(64);
    expect(result.ipHash).not.toBe('192.168.1.1');
    expect(repository.getAll()).toHaveLength(1);
  });

  it('should produce deterministic hashes for the same IP', async () => {
    const r1 = await useCase.execute({ shareId: 's1', event: 'VIEW', ip: '10.0.0.1' });
    const r2 = await useCase.execute({ shareId: 's1', event: 'VIEW', ip: '10.0.0.1' });

    expect(r1.ipHash).toBe(r2.ipHash);
  });

  it('should produce different hashes for different IPs', async () => {
    const r1 = await useCase.execute({ shareId: 's1', event: 'VIEW', ip: '10.0.0.1' });
    const r2 = await useCase.execute({ shareId: 's1', event: 'VIEW', ip: '10.0.0.2' });

    expect(r1.ipHash).not.toBe(r2.ipHash);
  });

  it('should pass optional fields through to repository', async () => {
    const result = await useCase.execute({
      shareId: 'share-1',
      event: 'DOWNLOAD',
      ip: '1.2.3.4',
      userAgent: 'TestAgent/1.0',
      referer: 'https://example.com',
      country: 'BR',
      city: 'Curitiba',
    });

    expect(result.event).toBe('DOWNLOAD');
    expect(result.userAgent).toBe('TestAgent/1.0');
    expect(result.referer).toBe('https://example.com');
    expect(result.country).toBe('BR');
    expect(result.city).toBe('Curitiba');
  });

  it('should set optional fields to null when not provided', async () => {
    const result = await useCase.execute({
      shareId: 'share-1',
      event: 'VIEW',
      ip: '1.1.1.1',
    });

    expect(result.userAgent).toBeNull();
    expect(result.referer).toBeNull();
    expect(result.country).toBeNull();
    expect(result.city).toBeNull();
  });
});
