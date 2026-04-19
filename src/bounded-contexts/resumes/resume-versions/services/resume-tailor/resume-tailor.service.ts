import { Inject, Injectable } from '@nestjs/common';
import { LLM_PORT, type LlmPort } from '@/bounded-contexts/ai/domain/ports/llm.port';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  ConflictException,
  EntityNotFoundException,
  ForbiddenException,
} from '@/shared-kernel/exceptions/domain.exceptions';

/**
 * Result shape returned to the UI after a tailor call — carries both the new
 * version's metadata and a bullet-level diff for immediate rendering.
 */
export type TailorResumeResult = {
  versionId: string;
  versionNumber: number;
  label: string;
  summary: string | null;
  jobTitle: string | null;
  bullets: Array<{
    id: string;
    original: string;
    tailored: string;
    highlights: string[];
  }>;
};

/**
 * Diff payload for an existing tailored version — computed at read time from
 * the snapshot so the UI always sees the current master content as "before".
 */
export type TailoredVersionDiff = {
  versionId: string;
  summary: { before: string | null; after: string | null } | null;
  jobTitle: { before: string | null; after: string | null } | null;
  bullets: Array<{
    id: string;
    before: string;
    after: string;
    highlights: string[];
  }>;
};

@Injectable()
export class ResumeTailorService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LLM_PORT) private readonly llm: LlmPort,
  ) {}

  async tailorForJob(params: {
    resumeId: string;
    userId: string;
    jobId?: string;
    jobDescription?: string;
    jobTitle?: string;
    jobCompany?: string;
  }): Promise<TailorResumeResult> {
    const resume = await this.loadOwnedResume(params.resumeId, params.userId);

    const job = await this.resolveJob(params);

    const llmInput = {
      resume: {
        summary: resume.summary,
        jobTitle: resume.jobTitle,
        primaryStack: resume.primaryStack ?? [],
        sections: resume.resumeSections.map((section) => ({
          key: section.sectionType.key,
          semanticKind: section.sectionType.semanticKind,
          items: section.items.map((item) => ({
            id: item.id,
            content: item.content as Record<string, unknown>,
          })),
        })),
      },
      job,
    };

    const tailored = await this.llm.tailorResume(llmInput);

    // Persist as a ResumeVersion with isTailored=true. We store the full
    // current master as `snapshot` plus the LLM diff on top, so the UI can
    // reconstruct before/after at read time.
    const lastVersion = await this.prisma.resumeVersion.findFirst({
      where: { resumeId: resume.id },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    const nextNumber = (lastVersion?.versionNumber ?? 0) + 1;

    const label = this.labelFor(job);

    const snapshot = {
      // Current master (frozen) — lets us show the "before" even if the master
      // changes after the tailor completes.
      master: {
        summary: resume.summary,
        jobTitle: resume.jobTitle,
        bullets: this.flattenBullets(resume),
      },
      tailored: {
        summary: tailored.summary,
        jobTitle: tailored.jobTitle,
        bullets: tailored.bullets,
      },
    };

    const created = await this.prisma.resumeVersion.create({
      data: {
        resumeId: resume.id,
        versionNumber: nextNumber,
        snapshot: snapshot as unknown as Parameters<
          typeof this.prisma.resumeVersion.create
        >[0]['data']['snapshot'],
        label,
        isTailored: true,
        tailoredJobId: params.jobId ?? null,
      },
      select: {
        id: true,
        versionNumber: true,
        label: true,
      },
    });

    return {
      versionId: created.id,
      versionNumber: created.versionNumber,
      label: created.label ?? label,
      summary: tailored.summary,
      jobTitle: tailored.jobTitle,
      bullets: tailored.bullets,
    };
  }

  async getTailoredVersions(resumeId: string, userId: string) {
    await this.assertOwnership(resumeId, userId);
    return this.prisma.resumeVersion.findMany({
      where: { resumeId, isTailored: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        versionNumber: true,
        label: true,
        createdAt: true,
        tailoredJobId: true,
      },
    });
  }

  async getDiff(resumeId: string, versionId: string, userId: string): Promise<TailoredVersionDiff> {
    await this.assertOwnership(resumeId, userId);

    const version = await this.prisma.resumeVersion.findUnique({
      where: { id: versionId },
      select: {
        id: true,
        resumeId: true,
        snapshot: true,
      },
    });

    if (!version || version.resumeId !== resumeId) {
      throw new EntityNotFoundException('ResumeVersion', versionId);
    }

    const snap = version.snapshot as {
      master?: {
        summary?: string | null;
        jobTitle?: string | null;
        bullets?: Array<{ id: string; content: string }>;
      };
      tailored?: {
        summary?: string | null;
        jobTitle?: string | null;
        bullets?: Array<{ id: string; original: string; tailored: string; highlights?: string[] }>;
      };
    };

    const master = snap.master ?? {};
    const tailored = snap.tailored ?? {};

    return {
      versionId: version.id,
      summary:
        tailored.summary !== undefined && tailored.summary !== null
          ? { before: master.summary ?? null, after: tailored.summary }
          : null,
      jobTitle:
        tailored.jobTitle !== undefined && tailored.jobTitle !== null
          ? { before: master.jobTitle ?? null, after: tailored.jobTitle }
          : null,
      bullets: (tailored.bullets ?? []).map((b) => ({
        id: b.id,
        before: b.original,
        after: b.tailored,
        highlights: b.highlights ?? [],
      })),
    };
  }

  // ---- internals ----

  private async loadOwnedResume(resumeId: string, userId: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: {
        id: true,
        userId: true,
        summary: true,
        jobTitle: true,
        primaryStack: true,
        resumeSections: {
          include: {
            sectionType: { select: { key: true, semanticKind: true } },
            items: { orderBy: { order: 'asc' }, select: { id: true, content: true } },
          },
        },
      },
    });
    if (!resume) throw new EntityNotFoundException('Resume', resumeId);
    if (resume.userId !== userId) throw new ForbiddenException('You do not own this resume');
    return resume;
  }

  private async assertOwnership(resumeId: string, userId: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { userId: true },
    });
    if (!resume) throw new EntityNotFoundException('Resume', resumeId);
    if (resume.userId !== userId) throw new ForbiddenException('You do not own this resume');
  }

  private async resolveJob(params: {
    jobId?: string;
    jobDescription?: string;
    jobTitle?: string;
    jobCompany?: string;
  }) {
    if (params.jobId) {
      const job = await this.prisma.job.findUnique({ where: { id: params.jobId } });
      if (!job) throw new EntityNotFoundException('Job', params.jobId);
      return {
        title: job.title,
        company: job.company,
        description: job.description,
        requirements: job.requirements,
        skills: job.skills,
      };
    }

    if (!params.jobDescription || params.jobDescription.trim().length < 10) {
      throw new ConflictException('TAILOR_INPUT_REQUIRED');
    }

    return {
      title: params.jobTitle ?? 'Target role',
      company: params.jobCompany ?? 'Unknown company',
      description: params.jobDescription,
      requirements: [],
      skills: [],
    };
  }

  private flattenBullets(resume: {
    resumeSections: Array<{
      sectionType: { key: string };
      items: Array<{ id: string; content: unknown }>;
    }>;
  }): Array<{ id: string; content: string }> {
    const out: Array<{ id: string; content: string }> = [];
    for (const section of resume.resumeSections) {
      for (const item of section.items) {
        const content = item.content as Record<string, unknown> | null;
        if (!content) continue;
        // Many section types store their visible text under `description` or
        // `title`. We keep the raw JSON around in the master snapshot via
        // `master.bullets` only for fields we know how to show.
        const pick =
          (typeof content.description === 'string' && content.description) ||
          (typeof content.title === 'string' && content.title) ||
          (typeof content.name === 'string' && content.name) ||
          '';
        if (pick) out.push({ id: item.id, content: pick });
      }
    }
    return out;
  }

  private labelFor(job: { title: string; company: string }): string {
    const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
    return `Tailored for ${clean(job.company)} — ${clean(job.title)}`.slice(0, 180);
  }
}
