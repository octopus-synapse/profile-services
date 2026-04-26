import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

type CachedAlerts = { at: number; data: AdminAlerts };

export interface AdminAlerts {
  reportsPending: number;
  usersPendingVerification: number;
  shadowProfilesStale: number;
  // Sum of the above — quick badge the UI can show in navbar.
  total: number;
}

@Injectable()
export class AdminAlertsService {
  private cache: CachedAlerts | null = null;
  private static readonly CACHE_TTL_MS = 30_000;

  constructor(private readonly prisma: PrismaService) {}

  async getAlerts(): Promise<AdminAlerts> {
    const now = Date.now();
    if (this.cache && now - this.cache.at < AdminAlertsService.CACHE_TTL_MS) {
      return this.cache.data;
    }

    const sevenDaysAgo = new Date(now - SEVEN_DAYS_MS);
    const thirtyDaysAgo = new Date(now - THIRTY_DAYS_MS);

    const [reportsPending, usersPendingVerification, shadowProfilesStale] = await Promise.all([
      this.prisma.postReport.count({ where: { status: 'PENDING' } }),
      this.prisma.user.count({
        where: { emailVerified: null, createdAt: { lt: sevenDaysAgo } },
      }),
      this.prisma.shadowProfile.count({
        where: { claimedByUserId: null, createdAt: { lt: thirtyDaysAgo } },
      }),
    ]);

    const data: AdminAlerts = {
      reportsPending,
      usersPendingVerification,
      shadowProfilesStale,
      total: reportsPending + usersPendingVerification + shadowProfilesStale,
    };
    this.cache = { at: now, data };
    return data;
  }
}
