import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { WeeklyDigestService } from '@/bounded-contexts/notifications/services/weekly-digest.service';
import { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import { closeApp, createTestUserAndLogin, getApp, getPrisma, uniqueTestEmail } from './setup';

describe('Weekly Digest Integration', () => {
  let userId: string;
  let resumeId: string;
  let sentEmails: Array<{ to: string; subject: string; text: string }>;

  beforeAll(async () => {
    const app = await getApp();
    const { userId: id } = await createTestUserAndLogin({
      email: uniqueTestEmail('weekly-digest'),
    });
    userId = id;

    const prisma = getPrisma();
    const resume = await prisma.resume.create({
      data: {
        userId,
        title: 'Weekly Digest Resume',
        contentPtBr: { sections: [] },
      },
    });
    resumeId = resume.id;

    sentEmails = [];
    const stubEmail = {
      sendEmail: async (opts: { to: string; subject: string; text: string }) => {
        sentEmails.push({ to: opts.to, subject: opts.subject, text: opts.text });
      },
    } as unknown as EmailService;

    // Swap the real EmailService binding at the DI layer to capture sends
    app as unknown as { get: (tok: unknown) => unknown; container?: unknown };
    const container = (app as unknown as { get: (t: unknown) => EmailService }).get(EmailService);
    // biome-ignore lint/suspicious/noExplicitAny: override runtime for assertion
    (container as any).sendEmail = stubEmail.sendEmail;
  });

  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.userWeeklyDigestLog.deleteMany({ where: { userId } });
    await prisma.resumeShare.deleteMany({ where: { resumeId } });
    await prisma.resumeViewEvent.deleteMany({ where: { resumeId } });
    await prisma.resumeVersion.deleteMany({ where: { resumeId } });
    await prisma.resume.delete({ where: { id: resumeId } });
    await prisma.user.delete({ where: { id: userId } });
    await closeApp();
  });

  it('sends a digest when the user has resume views in the last week', async () => {
    const prisma = getPrisma();

    await prisma.resumeViewEvent.createMany({
      data: [
        { resumeId, ipHash: 'hash-a' },
        { resumeId, ipHash: 'hash-b' },
        { resumeId, ipHash: 'hash-c' },
      ],
    });

    const app = await getApp();
    const service = app.get(WeeklyDigestService);

    const result = await service.sendWeeklyDigests();
    expect(result.usersEmailed).toBeGreaterThanOrEqual(1);

    const mine = sentEmails.find((e) => e.text.includes('resume view'));
    expect(mine).toBeDefined();
    expect(mine?.text).toContain('3');
  });

  it('is idempotent within the same ISO week', async () => {
    const app = await getApp();
    const service = app.get(WeeklyDigestService);

    const before = sentEmails.length;
    const result = await service.sendWeeklyDigests();
    const after = sentEmails.length;

    // No new email should have been sent — user was already logged for this week.
    expect(result.usersSkipped).toBeGreaterThanOrEqual(1);
    expect(after).toBe(before);
  });
});
