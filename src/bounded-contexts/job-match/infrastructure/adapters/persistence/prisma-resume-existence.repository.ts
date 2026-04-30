import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumeExistencePort } from '../../../domain/ports/resume-existence.port';

export class PrismaResumeExistence extends ResumeExistencePort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }
  async exists(resumeId: string): Promise<boolean> {
    const row = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { id: true },
    });
    return row !== null;
  }
}
