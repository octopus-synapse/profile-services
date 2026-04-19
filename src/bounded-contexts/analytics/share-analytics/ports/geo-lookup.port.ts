export interface GeoLocation {
  country: string | null;
  city: string | null;
}

export const GEO_LOOKUP_PORT = Symbol('GeoLookupPort');

export interface GeoLookupPort {
  lookup(ip: string): Promise<GeoLocation | null>;
}
