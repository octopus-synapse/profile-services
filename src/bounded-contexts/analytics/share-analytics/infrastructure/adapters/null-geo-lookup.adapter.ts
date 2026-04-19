import { Injectable } from '@nestjs/common';
import type { GeoLocation, GeoLookupPort } from '../../ports/geo-lookup.port';

/**
 * Default adapter — resolves no geo info. Replace via module override
 * when a real geoip provider (MaxMind, ip-api, etc.) is wired.
 */
@Injectable()
export class NullGeoLookupAdapter implements GeoLookupPort {
  async lookup(_ip: string): Promise<GeoLocation | null> {
    return null;
  }
}
