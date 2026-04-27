/**
 * Prisma adapter for `AntiGhostingRepositoryPort`.
 *
 * Wraps four collections:
 *   - `JobApplication` (with the latest event + job join) for the
 *     stale-candidate scan
 *   - `JobApplicationReminderLog` for the unique-by-`(applicationId,
 *     threshold)` idempotency check + write
 *   - `User` for the recipient email + name
 *   - `Notification` for the in-app `APPLICATION_STALE` row that
 *     mirrors every email reminder
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import type {
  AntiGhostingNotificationInput,
  AntiGhostingUser,
  ReminderThreshold,
  StaleApplicationCandidate,
} from '../../../domain/entities/anti-ghosting';
import { AntiGhostingRepositoryPort } from '../../../domain/ports/anti-ghosting.repository.port';

export class PrismaAntiGhostingRepository extends AntiGhostingRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async findStaleCandidates(cutoff: Date): Promise<StaleApplicationCandidate[]> {
    const rows = await this.prisma.jobApplication.findMany({
      where: {
        status: 'SUBMITTED',
        updatedAt: { lte: cutoff },
      },
      include: {
        events: { orderBy: { occurredAt: 'desc' }, take: 1 },
        job: { select: { title: true, company: true } },
      },
    });

    return rows.map((row) => {
      const lastEvent = row.events[0];
      return {
        id: row.id,
        userId: row.userId,
        createdAt: row.createdAt,
        jobTitle: row.job.title,
        company: row.job.company ?? 'the company',
        lastEvent: lastEvent ? { type: lastEvent.type, occurredAt: lastEvent.occurredAt } : null,
      };
    });
  }

  async hasReminderBeenSent(applicationId: string, threshold: ReminderThreshold): Promise<boolean> {
    const row = await this.prisma.jobApplicationReminderLog.findUnique({
      where: { applicationId_threshold: { applicationId, threshold } },
      select: { id: true },
    });
    return row !== null;
  }

  async findUser(userId: string): Promise<AntiGhostingUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (!user || !user.email) return null;
    return { email: user.email, name: user.name };
  }

  async recordReminderLog(applicationId: string, threshold: ReminderThreshold): Promise<void> {
    await this.prisma.jobApplicationReminderLog.create({
      data: { applicationId, threshold },
    });
  }

  async createStaleNotification(input: AntiGhostingNotificationInput): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: 'APPLICATION_STALE',
        message: `Aplicação para ${input.company} (${input.jobTitle}) está há ${input.daysSilent} dias sem resposta. Considere enviar um follow-up.`,
        messageKey: 'notification.application_stale',
        messageParams: {
          company: input.company,
          jobTitle: input.jobTitle,
          daysSilent: input.daysSilent,
          applicationId: input.applicationId,
        },
      },
    });
  }
}
