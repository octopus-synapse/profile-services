/**
 * ATS Simulator Service
 *
 * Loads a resume from Prisma, maps it to the simulator input shape, and
 * runs the parser simulation. Lives as a service (not in the controller)
 * so the architectural rule banning DB queries in controllers stays clean.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  EntityNotFoundException,
  ForbiddenException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import { type AtsSimulationResult, simulateAtsParsing } from '../simulation/ats-parser-simulator';
import { buildSimulationInput } from '../simulation/build-simulation-input';

@Injectable()
export class AtsSimulatorService {
  constructor(private readonly prisma: PrismaService) {}

  async simulateForResume(resumeId: string, viewerId: string): Promise<AtsSimulationResult> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: {
        userId: true,
        resumeSections: {
          where: { isVisible: true },
          orderBy: { order: 'asc' },
          select: {
            titleOverride: true,
            sectionType: { select: { title: true, semanticKind: true } },
            items: {
              where: { isVisible: true },
              orderBy: { order: 'asc' },
              select: { content: true },
            },
          },
        },
      },
    });

    if (!resume) throw new EntityNotFoundException('Resume', resumeId);
    if (resume.userId !== viewerId) {
      throw new ForbiddenException('You do not have access to this resume');
    }

    const input = buildSimulationInput({
      sections: resume.resumeSections.map((s) => ({
        title: s.titleOverride ?? s.sectionType.title,
        semanticKind: s.sectionType.semanticKind,
        column: 'full-width',
        items: s.items.map((it) => ({
          content: (it.content as Record<string, unknown> | null) ?? null,
        })),
      })),
    });

    return simulateAtsParsing(input);
  }
}
