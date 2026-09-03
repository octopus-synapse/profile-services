import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { ResumesRepository } from '@/bounded-contexts/resumes/core/resumes.repository';
import { resolveResumeProse } from '@/shared-kernel/i18n/translation-envelope';
import { type Locale, parseLocale } from '@/shared-kernel/utils/locale-resolver.util';
import type {
  PublicUserListItem,
  UpdateProfileData,
  UserProfile,
} from '../../../application/ports/user-profile.port';
import { UserProfileRepositoryPort } from '../../../application/ports/user-profile.port';

/**
 * Prose (`headline`, `bio`) is read from the primary résumé (ADR-003 §7: it is
 * the thing with a locale). The `User` columns stay as a fallback for accounts
 * that never finished onboarding, until they are dropped.
 */
const PROSE_FROM_RESUME = {
  primaryResume: {
    select: { headline: true, summary: true, jobTitle: true, language: true, translations: true },
  },
} as const;

type ProseRow = {
  headline: string | null;
  summary: string | null;
  jobTitle: string | null;
  language: string;
  translations: unknown;
};

/** The primary résumé's prose in `locale` (ADR-003 §12), or as written. */
function proseOf(row: ProseRow | null | undefined, locale: Locale | undefined) {
  if (!row) return null;
  const canonical = parseLocale(row.language);
  return resolveResumeProse(
    { summary: row.summary, headline: row.headline, jobTitle: row.jobTitle },
    row.translations,
    canonical,
    locale ?? canonical,
  );
}

export class UserProfileRepository extends UserProfileRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resumesRepository: ResumesRepository,
  ) {
    super();
  }

  async findUserByUsername(username: string, locale?: Locale) {
    const row = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        name: true,
        photoURL: true,
        location: true,
        website: true,
        portfolio: true,
        linkedin: true,
        github: true,
        preferences: { select: { allowSearchEngineIndex: true } },
        ...PROSE_FROM_RESUME,
      },
    });
    if (!row) return null;
    const { primaryResume, preferences, ...user } = row;
    const prose = proseOf(primaryResume, locale);
    return {
      ...user,
      headline: prose?.headline ?? null,
      bio: prose?.summary ?? null,
      allowSearchEngineIndex: preferences?.allowSearchEngineIndex ?? false,
    };
  }

  async findResumeByUserId(
    userId: string,
    locale?: Locale,
  ): Promise<Record<string, unknown> | null> {
    const resume = await this.resumesRepository.findResumeByUserId(userId);
    if (!resume) return null;
    const prose = proseOf(resume, locale);
    return { ...resume, ...prose, contentLocale: locale ?? parseLocale(resume.language) };
  }

  async findUserProfileById(userId: string): Promise<UserProfile | null> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        photoURL: true,
        location: true,
        phone: true,
        website: true,
        portfolio: true,
        linkedin: true,
        github: true,
        usernameUpdatedAt: true,
        createdAt: true,
        updatedAt: true,
        ...PROSE_FROM_RESUME,
      },
    });
    if (!row) return null;
    const { primaryResume, ...user } = row;
    return {
      ...user,
      headline: primaryResume?.headline ?? null,
      bio: primaryResume?.summary ?? null,
    };
  }

  async findUserById(userId: string): Promise<{ id: string } | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
  }

  async updateUserProfile(userId: string, data: UpdateProfileData): Promise<UserProfile> {
    // The avatar lives in two columns historically (`image` for NextAuth,
    // `photoURL` for the profile read). Keep them in sync on this path so a
    // set/clear via the profile actually reflects on the next read.
    const { image, bio, headline, ...rest } = data;
    // Prose goes to the primary résumé (ADR-003 §7). A person with no
    // résumé yet has nowhere to keep it — the onboarding will write it.
    if (bio !== undefined || headline !== undefined) {
      const owner = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { primaryResumeId: true },
      });
      if (owner?.primaryResumeId) {
        await this.prisma.resume.update({
          where: { id: owner.primaryResumeId },
          data: {
            ...(bio !== undefined ? { summary: bio } : {}),
            ...(headline !== undefined ? { headline } : {}),
          },
        });
      }
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...rest,
        ...(image !== undefined ? { image, photoURL: image } : {}),
      },
    });
    const profile = await this.findUserProfileById(userId);
    if (!profile) throw new Error(`User ${userId} vanished during profile update`);
    return profile;
  }

  async listPublicUsers(
    page: number,
    limit: number,
  ): Promise<{ items: PublicUserListItem[]; total: number }> {
    const where = { username: { not: null }, isActive: true } as const;
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: { username: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    const items: PublicUserListItem[] = rows
      .filter((r): r is { username: string; updatedAt: Date } => r.username !== null)
      .map((r) => ({ username: r.username, updatedAt: r.updatedAt }));
    return { items, total };
  }
}
