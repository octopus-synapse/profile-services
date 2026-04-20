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
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ConflictException } from '@/shared-kernel/exceptions/domain.exceptions';
import { buildShadowPayload, ShadowPayloadSchema } from './build-shadow-payload';
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
    const parsed = ShadowPayloadSchema.parse(buildShadowPayload(user, repos));
    const payload = parsed as unknown as Prisma.InputJsonValue;

    const row = await this.prisma.shadowProfile.upsert({
      where: { source_externalHandle: { source: 'github', externalHandle: user.login } },
      create: {
        source: 'github',
        externalHandle: user.login,
        contactEmail: null,
        payload,
      },
      update: { payload },
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

    // Apply the shadow payload to the user's primary resume so the claim is
    // user-visible. Creates a fresh resume if there isn't one yet, otherwise
    // merges (existing skills win on conflict — never overwrite curated data).
    await this.applyPayloadToUser(userId, existing.payload as PayloadShape);

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

  private async applyPayloadToUser(userId: string, payload: PayloadShape): Promise<void> {
    const stack = (payload.primaryStack ?? []).filter(
      (s): s is string => typeof s === 'string' && s.length > 0,
    );
    const headline = typeof payload.headline === 'string' ? payload.headline : null;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { primaryResumeId: true },
    });

    if (user?.primaryResumeId) {
      const resume = await this.prisma.resume.findUnique({
        where: { id: user.primaryResumeId },
        select: { primaryStack: true, jobTitle: true },
      });
      const merged = Array.from(new Set([...(resume?.primaryStack ?? []), ...stack]));
      await this.prisma.resume.update({
        where: { id: user.primaryResumeId },
        data: {
          primaryStack: merged,
          // Don't clobber a custom job title; only fill when empty.
          jobTitle: resume?.jobTitle ?? headline,
        },
      });
      return;
    }

    const created = await this.prisma.resume.create({
      data: {
        userId,
        title: 'My resume',
        primaryStack: stack,
        jobTitle: headline,
        contentPtBr: { sections: [] },
      },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { primaryResumeId: created.id },
    });
  }
}

interface PayloadShape {
  headline?: string | null;
  primaryStack?: string[];
  projects?: Array<{ name: string; url: string; summary: string }>;
}
