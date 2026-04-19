/**
 * TrackShareEventUseCase - Unit Tests
 *
 * Contract tests for the track share event use case.
 * Verifies IP anonymization (GDPR) and delegation to repository.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import type { GeoLocation, GeoLookupPort } from '../../../ports/geo-lookup.port';
import { InMemoryShareAnalyticsRepository } from '../../../testing';
import { TrackShareEventUseCase } from './track-share-event.use-case';

class StubGeoLookup implements GeoLookupPort {
  constructor(private readonly result: GeoLocation | null) {}
  async lookup(_ip: string): Promise<GeoLocation | null> {
    return this.result;
  }
}

describe('TrackShareEventUseCase', () => {
  let useCase: TrackShareEventUseCase;
  let repository: InMemoryShareAnalyticsRepository;

  beforeEach(() => {
    repository = new InMemoryShareAnalyticsRepository();
    useCase = new TrackShareEventUseCase(repository, new StubGeoLookup(null));
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
    expect(result.deviceType).toBeNull();
    expect(result.browser).toBeNull();
    expect(result.os).toBeNull();
  });

  it('should auto-derive deviceType/browser/os from userAgent', async () => {
    const result = await useCase.execute({
      shareId: 'share-1',
      event: 'VIEW',
      ip: '1.1.1.1',
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 Version/16.0 Mobile/15E148 Safari/604.1',
    });

    expect(result.deviceType).toBe('mobile');
    expect(result.os).toBe('iOS');
    expect(result.browser).toBe('Safari');
  });

  it('should not overwrite explicit deviceType when caller supplies it', async () => {
    const result = await useCase.execute({
      shareId: 'share-1',
      event: 'VIEW',
      ip: '1.1.1.1',
      userAgent: 'Googlebot/2.1 (+http://www.google.com/bot.html)',
      deviceType: 'desktop',
    });

    expect(result.deviceType).toBe('desktop');
  });

  it('should fill country/city from geo lookup when not provided', async () => {
    const repoWithGeo = new InMemoryShareAnalyticsRepository();
    const geoCase = new TrackShareEventUseCase(
      repoWithGeo,
      new StubGeoLookup({ country: 'BR', city: 'São Paulo' }),
    );

    const result = await geoCase.execute({
      shareId: 'share-geo',
      event: 'VIEW',
      ip: '200.150.100.50',
    });

    expect(result.country).toBe('BR');
    expect(result.city).toBe('São Paulo');
  });

  it('should prefer explicit country/city over geo lookup result', async () => {
    const repoWithGeo = new InMemoryShareAnalyticsRepository();
    const geoCase = new TrackShareEventUseCase(
      repoWithGeo,
      new StubGeoLookup({ country: 'BR', city: 'São Paulo' }),
    );

    const result = await geoCase.execute({
      shareId: 'share-geo',
      event: 'VIEW',
      ip: '200.150.100.50',
      country: 'US',
      city: 'New York',
    });

    expect(result.country).toBe('US');
    expect(result.city).toBe('New York');
  });
});
