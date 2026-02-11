import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { CacheCoreService } from '@/bounded-contexts/platform/common/cache/services/cache-core.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { EventPublisher } from '@/shared-kernel';
import { ResumePublishedEvent } from '../../domain/events';

interface CreateShare {
  resumeId: string;
  slug?: string;
  password?: string;
  expiresAt?: Date;
}

@Injectable()
export class ResumeShareService {
  private readonly CACHE_TTL = 60; // 60 seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheCoreService,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async createShare(dto: CreateShare) {
    const slug = dto.slug ?? this.generateSlug();

    // Validate custom slug
    if (dto.slug && !this.isValidSlug(dto.slug)) {
      throw new Error('Invalid slug format. Use alphanumeric characters and hyphens only.');
    }

    // Check slug uniqueness
    const existing = await this.prisma.resumeShare.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new Error('Slug already in use');
    }

    // Hash password if provided
    const hashedPassword = dto.password ? await bcrypt.hash(dto.password, 10) : null;

    // Get userId from resume before creating share
    const resume = await this.prisma.resume.findUnique({
      where: { id: dto.resumeId },
      select: { userId: true },
    });

    const share = await this.prisma.resumeShare.create({
      data: {
        resumeId: dto.resumeId,
        slug,
        password: hashedPassword,
        expiresAt: dto.expiresAt,
      },
    });

    if (resume) {
      this.eventPublisher.publish(
        new ResumePublishedEvent(dto.resumeId, {
          userId: resume.userId,
          slug,
        }),
      );
    }

    return share;
  }

  async getBySlug(slug: string) {
    return this.prisma.resumeShare.findUnique({
      where: { slug },
      include: { resume: true },
    });
  }

  async getResumeWithCache(resumeId: string) {
    const cacheKey = `public:resume:${resumeId}`;

    // Try cache first
    const cached = await this.cache.get<unknown>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        experiences: { orderBy: { startDate: 'desc' } },
        education: { orderBy: { startDate: 'desc' } },
        skills: { orderBy: { order: 'asc' } },
        languages: { orderBy: { order: 'asc' } },
        projects: { orderBy: { startDate: 'desc' } },
        certifications: { orderBy: { issueDate: 'desc' } },
        awards: { orderBy: { date: 'desc' } },
      },
    });

    if (!resume) {
      return null;
    }

    // Cache for 60 seconds
    await this.cache.set(cacheKey, resume, this.CACHE_TTL);

    return resume;
  }

  async verifyPassword(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }

  async deleteShare(shareId: string) {
    return this.prisma.resumeShare.delete({
      where: { id: shareId },
    });
  }

  async listUserShares(resumeId: string) {
    return this.prisma.resumeShare.findMany({
      where: { resumeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private generateSlug(): string {
    return nanoid(10); // 10 characters
  }

  private isValidSlug(slug: string): boolean {
    return /^[a-zA-Z0-9-]+$/.test(slug);
  }
}
