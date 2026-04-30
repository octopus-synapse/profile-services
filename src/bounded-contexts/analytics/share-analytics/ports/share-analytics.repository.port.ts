/**
 * Share Analytics Repository Port
 *
 * Interface defining the contract for share analytics data access.
 * Enables clean architecture by decoupling business logic from infrastructure.
 *
 * @see ShareAnalyticsService - Uses this port for analytics operations
 * @see PrismaShareAnalyticsRepository - Production implementation
 * @see InMemoryShareAnalyticsRepository - Test implementation
 */

import type { AnalyticsEvent } from '@prisma/client';

// ============================================================================
// Domain Types
// ============================================================================

export interface ShareAnalyticsRecord {
  id: string;
  shareId: string;
  event: AnalyticsEvent;
  ipHash: string;
  userAgent: string | null;
  referer: string | null;
  country: string | null;
  city: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  createdAt: Date;
}

export interface CreateShareAnalyticsData {
  shareId: string;
  event: AnalyticsEvent;
  ipHash: string;
  userAgent?: string;
  referer?: string;
  country?: string;
  city?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
}

export interface ShareWithOwner {
  id: string;
  resumeId: string;
  resume: { userId: string };
}

export interface EventCountResult {
  event: AnalyticsEvent;
  _count: { event: number };
}

export interface UniqueViewResult {
  ipHash: string;
  _count: { ipHash: number };
}

export interface CountryResult {
  country: string | null;
  _count: { country: number };
}

export interface DeviceTypeResult {
  deviceType: string | null;
  _count: { deviceType: number };
}

export interface RecentEventResult {
  event: AnalyticsEvent;
  country: string | null;
  city: string | null;
  createdAt: Date;
}

export interface EventFilters {
  startDate?: Date;
  endDate?: Date;
  eventType?: 'VIEW' | 'DOWNLOAD';
}

export interface DetailedEventResult {
  event: AnalyticsEvent;
  ipHash: string;
  userAgent: string | null;
  referer: string | null;
  country: string | null;
  city: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  createdAt: Date;
}

// ============================================================================
// Repository Port Interface
// ============================================================================

export abstract class ShareAnalyticsRepositoryPort {
  abstract create(data: CreateShareAnalyticsData): Promise<ShareAnalyticsRecord>;
  abstract findShareWithOwner(shareId: string): Promise<ShareWithOwner | null>;
  abstract groupByEvent(shareId: string): Promise<EventCountResult[]>;
  abstract groupByIpHash(shareId: string): Promise<UniqueViewResult[]>;
  abstract groupByCountry(shareId: string, limit: number): Promise<CountryResult[]>;
  abstract groupByDeviceType(shareId: string): Promise<DeviceTypeResult[]>;
  abstract getRecentEvents(shareId: string, limit: number): Promise<RecentEventResult[]>;
  abstract getDetailedEvents(
    shareId: string,
    filters?: EventFilters,
  ): Promise<DetailedEventResult[]>;
}
