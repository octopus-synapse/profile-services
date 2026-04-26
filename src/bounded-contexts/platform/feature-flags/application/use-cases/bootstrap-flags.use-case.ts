import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { LoggerPort } from '@/shared-kernel';
import { validateRegistry } from '../../domain/feature-flag-graph';
import { FeatureFlagRepositoryPort } from '../../domain/ports/feature-flag.repository.port';
import { FEATURE_FLAGS_REGISTRY } from '../../registry/feature-flags.registry';

const CTX = 'FeatureFlagsBootstrap';

/**
 * On boot: validate the code registry, upsert its flags into the DB, and mark
 * any previously-seeded flag that's no longer in the registry as `deprecated`.
 * Throws if the registry has cycles, duplicates or missing deps — we want the
 * app to fail loud rather than serve broken flag resolution.
 */
@Injectable()
export class BootstrapFlagsUseCase implements OnApplicationBootstrap {
  constructor(
    private readonly repo: FeatureFlagRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    validateRegistry(FEATURE_FLAGS_REGISTRY);

    await this.repo.upsertFromRegistry(
      FEATURE_FLAGS_REGISTRY.map((def) => ({
        key: def.key,
        name: def.name,
        description: def.description ?? null,
        defaultEnabled: def.defaultEnabled ?? false,
        dependsOn: [...def.dependsOn],
      })),
    );

    const allInDb = await this.repo.findAll();
    const registryKeys = new Set(FEATURE_FLAGS_REGISTRY.map((f) => f.key));
    const deprecatedCandidates = allInDb
      .filter((f) => !registryKeys.has(f.key) && !f.deprecated)
      .map((f) => f.key);

    if (deprecatedCandidates.length > 0) {
      await this.repo.markDeprecated(deprecatedCandidates);
      this.logger.log(
        `Marked ${deprecatedCandidates.length} flag(s) as deprecated: ${deprecatedCandidates.join(', ')}`,
        CTX,
      );
    }

    this.logger.log(`Feature flags ready — ${FEATURE_FLAGS_REGISTRY.length} registered`, CTX);
  }
}
