import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { nanoid } from 'nanoid';
import { CacheCoreService } from '@/bounded-contexts/platform/common/cache/services/cache-core.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { EventPublisher } from '@/shared-kernel';
import { toGenericSections } from '@/shared-kernel/schemas/sections';
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

  async createShare(userId: string, dto: CreateShare) {
    const slug = dto.slug ?? this.generateSlug();

    // Validate custom slug
    if (dto.slug && !this.isValidSlug(dto.slug)) {
      throw new BadRequestException(
        'Invalid slug format. Use alphanumeric characters and hyphens only.',
      );
    }

    // Check slug uniqueness
    const existing = await this.prisma.resumeShare.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException('Slug already in use');
    }

    // Hash password if provided
    const hashedPassword = dto.password ? await Bun.password.hash(dto.password, { algorithm: 'bcrypt', cost: 10 }) : null;

    // Verify resume ownership
    const resume = await this.prisma.resume.findUnique({
      where: { id: dto.resumeId },
      select: { userId: true },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('You do not have access to this resume');
    }

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
        resumeSections: {
          include: {
            sectionType: {
              select: {
                semanticKind: true,
              },
            },
            items: {
              orderBy: { order: 'asc' },
              select: {
                content: true,
              },
            },
          },
        },
      },
    });

    if (!resume) {
      return null;
    }

    const { resumeSections, ...resumeData } = resume;
    const sections = toGenericSections(
      resumeSections as Array<{
        sectionType: { semanticKind: string };
        items: Array<{ content: unknown }>;
      }>,
    );

    const resumeToCache = {
      ...resumeData,
      sections: sections.map((section) => ({
        semanticKind: section.semanticKind,
        items: section.items.map((item) => item.content),
      })),
    };

    // Cache for 60 seconds
    await this.cache.set(cacheKey, resumeToCache, this.CACHE_TTL);

    return resumeToCache;
  }

  async verifyPassword(plaintext: string, hash: string): Promise<boolean> {
    return Bun.password.verify(plaintext, hash);
  }

  async deleteShare(userId: string, shareId: string) {
    // Check if share exists first
    const share = await this.prisma.resumeShare.findUnique({
      where: { id: shareId },
      include: {
        resume: {
          select: { userId: true },
        },
      },
    });

    if (!share) {
      throw new NotFoundException('Share not found');
    }

    if (share.resume.userId !== userId) {
      throw new ForbiddenException('You do not have access to this share');
    }

    return this.prisma.resumeShare.delete({
      where: { id: shareId },
    });
  }

  async listUserShares(userId: string, resumeId: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { userId: true },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('You do not have access to this resume');
    }

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
