/**
 * Create Share Use Case
 */

import { randomBytes } from 'node:crypto';
import { EventPublisherPort, LoggerPort } from '@/shared-kernel';
import {
  ResumeAccessDeniedException,
  ResumeNotFoundException,
  ResumeShareSlugInvalidException,
  ResumeShareSlugTakenException,
} from '../../../domain/exceptions';
import { ResumePublishedEvent } from '../../../shared-kernel/domain/events';
import { ResumeReadRepositoryPort } from '../../domain/ports/resume-read.repository.port';
import { ShareRepositoryPort } from '../../domain/ports/share.repository.port';

interface CreateShareDto {
  resumeId: string;
  slug?: string;
  password?: string;
  expiresAt?: Date;
}

export class CreateShareUseCase {
  constructor(
    private readonly shareRepo: ShareRepositoryPort,
    private readonly resumeRepo: ResumeReadRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(userId: string, dto: CreateShareDto) {
    const slug = dto.slug ?? this.generateSlug();

    if (dto.slug && !this.isValidSlug(dto.slug)) {
      throw new ResumeShareSlugInvalidException();
    }

    const existing = await this.shareRepo.findBySlugOnly(slug);
    if (existing) {
      throw new ResumeShareSlugTakenException();
    }

    const hashedPassword = dto.password
      ? await Bun.password.hash(dto.password, { algorithm: 'bcrypt', cost: 10 })
      : null;

    const resume = await this.resumeRepo.findById(dto.resumeId);
    if (!resume) {
      throw new ResumeNotFoundException();
    }
    if (resume.userId !== userId) {
      throw new ResumeAccessDeniedException();
    }

    const share = await this.shareRepo.create({
      resumeId: dto.resumeId,
      slug,
      password: hashedPassword,
      expiresAt: dto.expiresAt ?? null,
    });

    this.eventPublisher.publish(
      new ResumePublishedEvent(dto.resumeId, { userId: resume.userId, slug }),
    );

    return share;
  }

  private generateSlug(): string {
    return randomBytes(8).toString('base64url').slice(0, 10);
  }

  private isValidSlug(slug: string): boolean {
    return /^[a-zA-Z0-9-]+$/.test(slug);
  }
}
