import { Injectable } from '@nestjs/common';
import {
  type NormalizedRequirementsResult,
  ScoringLlmPort,
} from '@/bounded-contexts/ai/domain/ports/scoring-llm.port';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import {
  RequirementsMatcherPort,
  type RequirementsMatchInput,
  type RequirementsMatchResult,
} from '../../domain/ports/requirements-matcher.port';

type StructuredRequirements = {
  minYears?: number;
  languages?: Array<{ language: string; cefr?: string }>;
  certifications?: string[];
  seniority?: string;
  mustHave?: string[];
};

const CEFR_ORDER: readonly string[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/**
 * Real Requirements Matcher — hybrid architecture per the plan:
 *   1. AI normalises the resume free-text into structured slots.
 *   2. Deterministic code compares those slots against the recruiter's
 *      filled requirements and emits per-slot matched/missing lists.
 *
 * The code half decides the score; the AI only reads. This keeps the
 * number explainable (recruiters can see exactly which slots failed)
 * and bounds hallucination risk — the AI never invents a score.
 */
@Injectable()
export class AiRequirementsMatcherAdapter extends RequirementsMatcherPort {
  constructor(
    private readonly scoringLlm: ScoringLlmPort,
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async match(input: RequirementsMatchInput): Promise<RequirementsMatchResult> {
    const required = this.asStructuredRequirements(input.structuredRequirements);
    const targetSlots = this.pickSlotsToAsk(required);
    if (targetSlots.length === 0) {
      return { score: 100, detail: { matchedSlots: [], missingSlots: [] } };
    }

    let normalized: NormalizedRequirementsResult;
    try {
      const resume = await this.loadResume(input.resumeId);
      if (!resume) return { score: null };
      normalized = await this.scoringLlm.normalizeRequirements({
        bullets: resume.bullets,
        skills: resume.skills,
        summary: resume.summary,
        targetSlots,
      });
    } catch (err) {
      this.logger.warn(
        `Requirements normaliser failed: ${(err as Error).message}`,
        'AiRequirementsMatcherAdapter',
      );
      return { score: null };
    }

    const { matched, missing } = this.compare(required, normalized);
    const total = matched.length + missing.length;
    const score = total === 0 ? 100 : Math.round((matched.length / total) * 100);
    return { score, detail: { matchedSlots: matched, missingSlots: missing } };
  }

  // ── Pure helpers ──────────────────────────────────────────────

  private asStructuredRequirements(raw: Readonly<Record<string, unknown>>): StructuredRequirements {
    // The job context stores `requirementsStructured` as free-form
    // JSON; we cast defensively. Unknown shapes fall through and the
    // corresponding slot just doesn't get compared.
    return (raw ?? {}) as StructuredRequirements;
  }

  private pickSlotsToAsk(
    req: StructuredRequirements,
  ): ReadonlyArray<'minYears' | 'languages' | 'certifications' | 'seniority'> {
    const out: Array<'minYears' | 'languages' | 'certifications' | 'seniority'> = [];
    if (typeof req.minYears === 'number') out.push('minYears');
    if (Array.isArray(req.languages) && req.languages.length > 0) out.push('languages');
    if (Array.isArray(req.certifications) && req.certifications.length > 0)
      out.push('certifications');
    if (typeof req.seniority === 'string') out.push('seniority');
    return out;
  }

  private compare(
    req: StructuredRequirements,
    candidate: NormalizedRequirementsResult,
  ): { matched: string[]; missing: string[] } {
    const matched: string[] = [];
    const missing: string[] = [];

    if (typeof req.minYears === 'number') {
      if (candidate.minYears !== null && candidate.minYears >= req.minYears) {
        matched.push(`years≥${req.minYears}`);
      } else {
        missing.push(`years≥${req.minYears}`);
      }
    }

    for (const language of req.languages ?? []) {
      const match = candidate.languages.find(
        (l) => l.language.toLowerCase() === language.language.toLowerCase(),
      );
      const requiredCefr = language.cefr ?? null;
      const candidateCefr = match?.cefr ?? null;
      const slotLabel = `${language.language}${requiredCefr ? `:${requiredCefr}` : ''}`;
      if (!match) {
        missing.push(slotLabel);
      } else if (!requiredCefr || meetsCefr(candidateCefr, requiredCefr)) {
        matched.push(slotLabel);
      } else {
        missing.push(slotLabel);
      }
    }

    for (const cert of req.certifications ?? []) {
      const found = candidate.certifications.some((c) =>
        c.toLowerCase().includes(cert.toLowerCase()),
      );
      if (found) matched.push(cert);
      else missing.push(cert);
    }

    if (typeof req.seniority === 'string') {
      const slotLabel = `seniority:${req.seniority}`;
      if (
        candidate.seniority &&
        candidate.seniority.toLowerCase() === req.seniority.toLowerCase()
      ) {
        matched.push(slotLabel);
      } else {
        missing.push(slotLabel);
      }
    }

    return { matched, missing };
  }

  private async loadResume(resumeId: string): Promise<{
    bullets: ReadonlyArray<{ id: string; text: string }>;
    skills: readonly string[];
    summary: string | null;
  } | null> {
    const row = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { summary: true, jobTitle: true, primaryStack: true },
    });
    if (!row) return null;
    return {
      bullets: row.jobTitle ? [{ id: 'role', text: row.jobTitle }] : [],
      skills: row.primaryStack ?? [],
      summary: row.summary,
    };
  }
}

function meetsCefr(candidate: string | null, required: string): boolean {
  if (!candidate) return false;
  const candIdx = CEFR_ORDER.indexOf(candidate);
  const reqIdx = CEFR_ORDER.indexOf(required);
  if (candIdx === -1 || reqIdx === -1) return false;
  return candIdx >= reqIdx;
}
