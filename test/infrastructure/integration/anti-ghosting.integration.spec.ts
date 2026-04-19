import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { AntiGhostingService } from '@/bounded-contexts/jobs/tracker/anti-ghosting.service';
import { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import { closeApp, createTestUserAndLogin, getApp, getPrisma, uniqueTestEmail } from './setup';

describe('Anti-ghosting Integration', () => {
  let userId: string;
  let jobId: string;
  let applicationId: string;
  const sent: Array<{ to: string; subject: string }> = [];

  beforeAll(async () => {
    const app = await getApp();
    const { userId: id } = await createTestUserAndLogin({
      email: uniqueTestEmail('ghosting'),
    });
    userId = id;

    const prisma = getPrisma();
    const job = await prisma.job.create({
      data: {
        title: 'Senior Backend',
        company: 'Acme',
        description: 'x',
        jobType: 'FULL_TIME',
        authorId: userId,
      },
    });
    jobId = job.id;

    const application = await prisma.jobApplication.create({
      data: {
        jobId,
        userId,
        status: 'SUBMITTED',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    });
    applicationId = application.id;

    const emailSvc = app.get(EmailService);
    // biome-ignore lint/suspicious/noExplicitAny: runtime stub
    (emailSvc as any).sendEmail = async (opts: { to: string; subject: string }) => {
      sent.push({ to: opts.to, subject: opts.subject });
    };
  });

  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.jobApplicationReminderLog.deleteMany({ where: { applicationId } });
    await prisma.jobApplicationEvent.deleteMany({ where: { applicationId } });
    await prisma.jobApplication.delete({ where: { id: applicationId } });
    await prisma.job.delete({ where: { id: jobId } });
    await prisma.user.delete({ where: { id: userId } });
    await closeApp();
  });

  it('sends a reminder for an application idle for 10 days', async () => {
    const app = await getApp();
    const service = app.get(AntiGhostingService);

    const result = await service.scanAndNotify();
    expect(result.reminded).toBeGreaterThanOrEqual(1);
    expect(sent.some((e) => e.subject.includes('Acme'))).toBe(true);
  });

  it('is idempotent within the same threshold', async () => {
    const app = await getApp();
    const service = app.get(AntiGhostingService);

    const before = sent.length;
    await service.scanAndNotify();
    expect(sent.length).toBe(before);
  });

  it('does not remind when the last event is a recruiter reply', async () => {
    const prisma = getPrisma();
    // Fresh application that got a VIEWED event yesterday — user shouldn't be nudged.
    const freshApp = await prisma.jobApplication.create({
      data: {
        jobId,
        userId,
        status: 'SUBMITTED',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.jobApplicationEvent.create({
      data: {
        applicationId: freshApp.id,
        type: 'VIEWED',
        occurredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    });

    const app = await getApp();
    const service = app.get(AntiGhostingService);
    const before = sent.length;
    await service.scanAndNotify();
    // No new email for the VIEWED application.
    expect(sent.length).toBe(before);

    await prisma.jobApplicationEvent.deleteMany({ where: { applicationId: freshApp.id } });
    await prisma.jobApplication.delete({ where: { id: freshApp.id } });
  });
});
