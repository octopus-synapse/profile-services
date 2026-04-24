import {
  CanActivate,
  ConflictException,
  type ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { GetLatestQualityUseCase } from '../../application/use-cases/get-latest-quality.use-case';

const MIN_QUALITY_KEY = 'requireMinQuality';
const RESUME_PARAM_KEY = 'requireMinQualityResumeParam';

interface AuthRequestLike {
  user?: { userId?: string; id?: string };
  params?: Record<string, string>;
}

/**
 * Plan invariant 6 — Auto-Apply / Tailor are off-limits when the
 * user's resume Quality Score is below `min` (default 50).
 *
 * Decorator usage:
 *   @RequireMinQuality()                          // 50, reads userPrimaryResumeId
 *   @RequireMinQuality(60)                        // tighter threshold
 *   @RequireMinQuality(50, 'resumeId')            // pulls resumeId from a route param
 *
 * Resolution order for the resumeId checked:
 *   1. The named route param if present and truthy.
 *   2. `req.user.primaryResumeId` lookup via Prisma.
 * Throws 409 `quality_score_below_threshold` either when the user has
 * no resume to score or when the latest snapshot is below `min`. A
 * `null` snapshot (never computed) also blocks — the recompute is
 * event-driven so the absence is itself a signal.
 */
export const RequireMinQuality = (
  min = 50,
  resumeParam: string | null = null,
): MethodDecorator & ClassDecorator => {
  return (target: object, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    SetMetadata(MIN_QUALITY_KEY, min)(target as never, propertyKey as never, descriptor as never);
    SetMetadata(RESUME_PARAM_KEY, resumeParam)(
      target as never,
      propertyKey as never,
      descriptor as never,
    );
  };
};

@Injectable()
export class RequireMinQualityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly getLatest: GetLatestQualityUseCase,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const min =
      this.reflector.getAllAndOverride<number>(MIN_QUALITY_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 50;
    const resumeParam =
      this.reflector.getAllAndOverride<string | null>(RESUME_PARAM_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? null;

    const req = context.switchToHttp().getRequest<AuthRequestLike>();
    const userId = req.user?.userId ?? req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Authenticated user not present on request');
    }

    let resumeId = resumeParam ? req.params?.[resumeParam] : undefined;
    if (!resumeId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { primaryResumeId: true },
      });
      resumeId = user?.primaryResumeId ?? undefined;
    }
    if (!resumeId) {
      throw new ConflictException({
        code: 'quality_score_below_threshold',
        message: 'No resume to score — create a primary resume before retrying',
        threshold: min,
      });
    }

    const latest = await this.getLatest.execute(resumeId);
    if (!latest || latest.overallScore < min) {
      throw new ConflictException({
        code: 'quality_score_below_threshold',
        message: `Resume Quality Score ${latest?.overallScore ?? '(never computed)'} is below the required ${min}`,
        currentScore: latest?.overallScore ?? null,
        threshold: min,
      });
    }
    return true;
  }
}
