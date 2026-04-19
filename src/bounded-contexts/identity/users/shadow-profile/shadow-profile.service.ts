/**
 * Shadow Profile Service
 *
 * Build-side: an internal job (or a future scraper) calls upsertGithub() to
 * pre-build profile data for someone who hasn't signed up yet.
 *
 * Claim-side: when a real user signs up the auth flow calls claimForUser()
 * with the candidate identifiers (verified email + optional GitHub login).
 * Returns the matched shadow rows so the onboarding flow can prefill the
 * resume and skip steps the user already has data for.
 */

import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ConflictException } from '@/shared-kernel/exceptions/domain.exceptions';
import { buildShadowPayload } from './build-shadow-payload';
import { SHADOW_GITHUB_API, type ShadowGithubApi } from './ports/github-api.port';

export interface ShadowProfileSnapshot {
  id: string;
  source: string;
  externalHandle: string;
  contactEmail: string | null;
  payload: unknown;
  claimedByUserId: string | null;
}

@Injectable()
export class ShadowProfileService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SHADOW_GITHUB_API) private readonly github: ShadowGithubApi,
  ) {}

  async upsertGithub(input: { token: string; username: string }): Promise<ShadowProfileSnapshot> {
    const user = await this.github.getUser(input.token, input.username);
    const repos = await this.github.listRepositories(input.token, user.login, { limit: 50 });
    const parsed = buildShadowPayload(user, repos);

    const row = await this.prisma.shadowProfile.upsert({
      where: { source_externalHandle: { source: 'github', externalHandle: user.login } },
      create: {
        source: 'github',
        externalHandle: user.login,
        contactEmail: null,
        payload: parsed as unknown as object,
      },
      update: { payload: parsed as unknown as object },
    });

    return {
      id: row.id,
      source: row.source,
      externalHandle: row.externalHandle,
      contactEmail: row.contactEmail,
      payload: row.payload,
      claimedByUserId: row.claimedByUserId,
    };
  }

  async findCandidatesFor(input: {
    email?: string;
    githubLogin?: string;
  }): Promise<ShadowProfileSnapshot[]> {
    const orClauses: Array<Record<string, unknown>> = [];
    if (input.email) orClauses.push({ contactEmail: input.email });
    if (input.githubLogin) orClauses.push({ source: 'github', externalHandle: input.githubLogin });
    if (orClauses.length === 0) return [];

    const rows = await this.prisma.shadowProfile.findMany({
      where: { claimedByUserId: null, OR: orClauses },
    });
    return rows.map((r) => ({
      id: r.id,
      source: r.source,
      externalHandle: r.externalHandle,
      contactEmail: r.contactEmail,
      payload: r.payload,
      claimedByUserId: r.claimedByUserId,
    }));
  }

  async claimForUser(shadowId: string, userId: string): Promise<ShadowProfileSnapshot> {
    const existing = await this.prisma.shadowProfile.findUnique({ where: { id: shadowId } });
    if (!existing) throw new ConflictException('Shadow profile not found');
    if (existing.claimedByUserId && existing.claimedByUserId !== userId) {
      throw new ConflictException('Shadow profile already claimed by another user');
    }

    const claimed = await this.prisma.shadowProfile.update({
      where: { id: shadowId },
      data: { claimedByUserId: userId, claimedAt: new Date() },
    });

    return {
      id: claimed.id,
      source: claimed.source,
      externalHandle: claimed.externalHandle,
      contactEmail: claimed.contactEmail,
      payload: claimed.payload,
      claimedByUserId: claimed.claimedByUserId,
    };
  }
}
