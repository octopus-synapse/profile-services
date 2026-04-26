export interface GeoLocation {
  country: string | null;
  city: string | null;
}

export abstract class GeoLookupPort {
  abstract lookup(ip: string): Promise<GeoLocation | null>;
}
