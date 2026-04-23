import {
  applyDecorators,
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagService } from '../../application/services/feature-flag.service';

export const FEATURE_FLAG_KEY = 'required_feature_flag';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly flags: FeatureFlagService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const key = this.reflector.getAllAndOverride<string | undefined>(FEATURE_FLAG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!key) return true;

    const request = context.switchToHttp().getRequest<{ user?: { id?: string } }>();
    const userId = request.user?.id ?? null;

    const enabled = await this.flags.isEnabled(key, userId);
    if (enabled) return true;

    // Treat a disabled feature as non-existent — it's more honest than 403,
    // and matches how the frontend also hides the surface.
    throw new NotFoundException('Not Found');
  }
}

/**
 * Guard a handler (or controller) behind a feature flag. When the flag is
 * effectively OFF for the caller, the endpoint behaves as if it doesn't exist.
 *
 * @example
 * @Get('pdf')
 * @FeatureFlag('resumes.export.pdf')
 * exportPdf() { ... }
 */
export const FeatureFlag = (key: string) =>
  applyDecorators(SetMetadata(FEATURE_FLAG_KEY, key), UseGuards(FeatureFlagGuard));
